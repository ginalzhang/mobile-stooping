const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const VERSION = process.env.SHOPIFY_API_VERSION || '2026-04';
const LOCATION_ID = process.env.SHOPIFY_LOCATION_ID;

function endpoint() {
  if (!DOMAIN) throw new Error('Missing SHOPIFY_STORE_DOMAIN.');
  return `https://${DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/admin/api/${VERSION}/graphql.json`;
}

async function admin(query, variables = {}) {
  if (!process.env.SHOPIFY_ADMIN_TOKEN) {
    throw new Error('Missing SHOPIFY_ADMIN_TOKEN.');
  }

  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(`Shopify Admin request failed with ${response.status}.`);
  }
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  return json.data;
}

export async function listLocations() {
  const data = await admin(`{ locations(first:10){ edges{ node{ id name } } } }`);
  return data.locations.edges.map((edge) => edge.node);
}

export async function inventoryItemIdForVariant(variantId) {
  const data = await admin(
    `query VariantInventory($id: ID!) {
      productVariant(id: $id) {
        inventoryItem { id }
      }
    }`,
    { id: variantId }
  );

  const inventoryItemId = data.productVariant?.inventoryItem?.id;
  if (!inventoryItemId) throw new Error('Could not resolve inventory item.');
  return inventoryItemId;
}

export async function setAvailable(inventoryItemId, quantity) {
  if (!LOCATION_ID) throw new Error('Missing SHOPIFY_LOCATION_ID.');
  if (quantity !== 0 && quantity !== 1) {
    throw new Error('Inventory quantity must be 0 or 1.');
  }

  const data = await admin(
    `mutation SetInventory($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        userErrors { field message }
      }
    }`,
    {
      input: {
        name: 'available',
        reason: 'correction',
        ignoreCompareQuantity: true,
        quantities: [
          { inventoryItemId, locationId: LOCATION_ID, quantity }
        ]
      }
    }
  );

  const errors = data.inventorySetQuantities?.userErrors;
  if (errors?.length) throw new Error(errors[0].message);
}
