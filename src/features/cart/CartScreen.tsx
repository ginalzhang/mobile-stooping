import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { createShopifyCart, fetchProduct } from "../../api/shopify";
import { AppButton } from "../../components/AppButton";
import { Screen } from "../../components/Screen";
import { StoopyMascot } from "../../components/StoopyMascot";
import { DEFAULT_PICKUP, ORDER_LIMIT } from "../../constants/pickup";
import { colors } from "../../theme/colors";
import { spacing, typography } from "../../theme/theme";
import type { OrderStackParamList } from "../../navigation/types";
import type { CartItem, ContactFormErrors, CustomerInfo } from "../../types/order";
import { useCart } from "./CartContext";

type Props = NativeStackScreenProps<OrderStackParamList, "OrderHome">;

export function CartScreen({ navigation }: Props) {
  const {
    checkoutLocked,
    clearCart,
    customer,
    items,
    removeItem,
    setCheckoutLocked,
    setConfirmation,
    setCustomer,
    totalQuantity
  } = useCart();
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(customer.phone);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutIssue, setCheckoutIssue] = useState<string | null>(null);

  useEffect(() => {
    setName(customer.name);
    setEmail(customer.email);
    setPhone(customer.phone);
  }, [customer]);

  const contactErrors = useMemo(
    () => validateContact({ email, name, phone }),
    [email, name, phone]
  );
  const customerValid = Object.keys(contactErrors).length === 0;
  const checkoutDisabledReason = useMemo(() => {
    if (checkingOut || checkoutLocked) return "Checkout is already in progress.";
    if (!items.length) return "Add at least one item to check out.";
    if (totalQuantity > ORDER_LIMIT) {
      return `Orders are limited to ${ORDER_LIMIT} items.`;
    }
    if (contactErrors.name) return contactErrors.name;
    if (contactErrors.email) return contactErrors.email;
    if (contactErrors.phone) return contactErrors.phone;
    return null;
  }, [checkingOut, checkoutLocked, contactErrors, items.length, totalQuantity]);
  const estimatedSavings = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + parseRetailValue(item.product.estimatedRetailValue) * item.quantity,
        0
      ),
    [items]
  );

  const browseShop = () => {
    navigation.getParent()?.navigate("Shop", { screen: "ShopHome" });
  };

  const checkout = async () => {
    if (checkoutDisabledReason) return;
    if (!customerValid) {
      Alert.alert("Contact info needed", "Add your name, email, and phone first.");
      return;
    }

    const cartSnapshot = snapshotCart(items);
    if (!cartSnapshot.length) return;

    setCheckoutIssue(null);
    setCheckoutLocked(true);
    setCheckingOut(true);
    try {
      const latestProducts = await Promise.all(
        cartSnapshot.map((item) =>
          fetchProduct({ id: item.product.id, handle: item.product.handle })
        )
      );
      const stockChanges = getStockChanges(cartSnapshot, latestProducts);

      if (stockChanges.length > 0) {
        const message = stockChanges.join("\n");
        setCheckoutIssue(message);
        Alert.alert("Stock changed", message);
        return;
      }
      const checkoutItems = latestProducts.map((product, index) => ({
        product: product!,
        quantity: cartSnapshot[index].quantity
      }));

      const nextCustomer = {
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim()
      };
      setCustomer(nextCustomer);

      const cart = await createShopifyCart({
        customer: nextCustomer,
        items: checkoutItems,
        note: `Stooping Club mobile order. Pickup: ${DEFAULT_PICKUP.window} at ${DEFAULT_PICKUP.address}`
      });

      if (cart.checkoutUrl) {
        await WebBrowser.openBrowserAsync(cart.checkoutUrl);
      }

      setConfirmation({
        checkoutUrl: cart.checkoutUrl,
        confirmedAt: new Date().toISOString(),
        customer: nextCustomer,
        items: checkoutItems
      });
      clearCart();
      navigation.navigate("Confirmation");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Checkout could not be started.";
      Alert.alert("Checkout failed", message);
    } finally {
      setCheckingOut(false);
      setCheckoutLocked(false);
    }
  };

  if (!items.length) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={typography.h1}>Your order</Text>
          <Text style={styles.emptyLimit}>0 of {ORDER_LIMIT} reserved</Text>
        </View>
        <EmptyOrder onBrowse={browseShop} />
        <PickupPolicy />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.h1}>Your order</Text>
        <Text style={styles.limit}>
          {totalQuantity} of {ORDER_LIMIT} reserved
          {estimatedSavings > 0 ? ` · about $${estimatedSavings} kept in your pocket` : ""}
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, (totalQuantity / ORDER_LIMIT) * 100)}%` }
            ]}
          />
        </View>
      </View>
      <View style={styles.items}>
        {items.map((item) => (
          <View key={item.product.variantId} style={styles.itemRow}>
            {item.product.images?.[0] ? (
              <Image source={{ uri: item.product.images[0] }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]} />
            )}
            <View style={styles.itemBody}>
              <Text numberOfLines={2} style={styles.itemTitle}>
                {item.product.title}
              </Text>
              {item.quantity > 1 ? (
                <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
              ) : null}
              <View style={styles.itemMetaRow}>
                <Text style={styles.itemPrice}>$0</Text>
                {item.product.estimatedRetailValue &&
                item.product.estimatedRetailValue !== "Not listed" ? (
                  <Text style={styles.itemRetail}>{item.product.estimatedRetailValue}</Text>
                ) : null}
                <Text numberOfLines={1} style={styles.conditionPill}>
                  {item.product.condition || "Good used condition"}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.product.title}`}
              disabled={checkingOut || checkoutLocked}
              onPress={() => removeItem(item.product.variantId)}
              style={[
                styles.remove,
                (checkingOut || checkoutLocked) && styles.removeDisabled
              ]}
            >
              <Text style={styles.removeText}>⌫</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <View style={styles.form}>
        <Text style={typography.h2}>Contact info</Text>
        <TextInput
          accessibilityLabel="Name"
          autoComplete="name"
          onChangeText={(value) => {
            setCheckoutIssue(null);
            setName(value);
          }}
          placeholder="Name"
          placeholderTextColor={colors.muted}
          style={[styles.input, contactErrors.name && styles.inputError]}
          textContentType="name"
          value={name}
        />
        {contactErrors.name ? (
          <Text style={styles.fieldError}>{contactErrors.name}</Text>
        ) : null}
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={(value) => {
            setCheckoutIssue(null);
            setEmail(value);
          }}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={[styles.input, contactErrors.email && styles.inputError]}
          textContentType="emailAddress"
          value={email}
        />
        {contactErrors.email ? (
          <Text style={styles.fieldError}>{contactErrors.email}</Text>
        ) : null}
        <TextInput
          accessibilityLabel="Phone"
          autoComplete="tel"
          keyboardType="phone-pad"
          onChangeText={(value) => {
            setCheckoutIssue(null);
            setPhone(value);
          }}
          placeholder="Phone"
          placeholderTextColor={colors.muted}
          style={[styles.input, contactErrors.phone && styles.inputError]}
          textContentType="telephoneNumber"
          value={phone}
        />
        {contactErrors.phone ? (
          <Text style={styles.fieldError}>{contactErrors.phone}</Text>
        ) : null}
      </View>
      <PickupPolicy />
      {checkoutIssue ? <Text style={styles.checkoutIssue}>{checkoutIssue}</Text> : null}
      <AppButton
        label={`Reserve ${totalQuantity} ${totalQuantity === 1 ? "find" : "finds"} for Sunday`}
        loading={checkingOut}
        disabled={Boolean(checkoutDisabledReason)}
        onPress={checkout}
      />
      {checkoutDisabledReason && !checkingOut ? (
        <Text style={styles.disabledReason}>{checkoutDisabledReason}</Text>
      ) : null}
      <Text style={styles.reminderText}>
        After checkout opens, use the pickup pass to schedule local Friday and Sunday
        reminder notifications on this device.
      </Text>
    </Screen>
  );
}

function PickupPolicy() {
  return (
    <View style={styles.policy}>
      <Text style={typography.h3}>{DEFAULT_PICKUP.label}</Text>
      <Text style={typography.body}>
        {DEFAULT_PICKUP.window} at {DEFAULT_PICKUP.address}.
      </Text>
      <Text style={typography.body}>
        Local pickup only. Reply to the Friday confirmation reminder or items may be
        relisted. Repeated no-shows may lead to suspension. Reselling Stooping Club
        items is not allowed.
      </Text>
    </View>
  );
}

function EmptyOrder({ onBrowse }: { onBrowse: () => void }) {
  return (
    <View style={styles.emptyState}>
      <StoopyMascot
        caption=""
        containerStyle={styles.emptyMascot}
        size="medium"
      />
      <Text style={styles.emptyTitle}>Your order is empty</Text>
      <Text style={styles.emptyMessage}>
        Browse the shop and reserve up to {ORDER_LIMIT} free finds for Sunday pickup.
      </Text>
      <AppButton
        label="Browse the shop"
        onPress={onBrowse}
        style={styles.emptyButton}
      />
    </View>
  );
}

function parseRetailValue(value?: string) {
  if (!value) return 0;
  const match = value.match(/\$?([0-9]+(?:\.[0-9]+)?)/);
  return match ? Math.round(Number(match[1])) : 0;
}

function validateContact(customer: CustomerInfo): ContactFormErrors {
  const errors: ContactFormErrors = {};
  const email = customer.email.trim();
  const phoneDigits = customer.phone.replace(/\D/g, "");

  if (!customer.name.trim()) {
    errors.name = "Enter your name.";
  }
  if (!email) {
    errors.email = "Enter your email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!customer.phone.trim()) {
    errors.phone = "Enter your phone number.";
  } else if (phoneDigits.length < 7) {
    errors.phone = "Enter a valid phone number.";
  }

  return errors;
}

function snapshotCart(items: CartItem[]): CartItem[] {
  return items.map((item) => ({
    product: { ...item.product, images: [...item.product.images], tags: [...item.product.tags] },
    quantity: item.quantity
  }));
}

function getStockChanges(
  cartSnapshot: CartItem[],
  latestProducts: Awaited<ReturnType<typeof fetchProduct>>[]
) {
  return cartSnapshot.flatMap((item, index) => {
    const latest = latestProducts[index];

    if (!latest || latest.variantId !== item.product.variantId) {
      return [`${item.product.title} is no longer available.`];
    }
    if (!latest.availableForSale || latest.stockCount <= 0) {
      return [`${latest.title} is now sold out.`];
    }
    if (latest.stockCount < item.quantity) {
      return [
        `${latest.title} only has ${latest.stockCount} left. Remove it and add the available quantity again.`
      ];
    }

    return [];
  });
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  limit: {
    color: colors.forest,
    fontSize: 16,
    fontWeight: "800"
  },
  emptyLimit: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "900"
  },
  progressTrack: {
    backgroundColor: colors.paper2,
    borderRadius: 999,
    height: 6,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.forest,
    borderRadius: 999,
    height: "100%"
  },
  items: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  itemRow: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md
  },
  thumb: {
    backgroundColor: colors.paper2,
    borderRadius: 6,
    height: 62,
    width: 62
  },
  thumbFallback: {
    borderColor: colors.border,
    borderWidth: 1
  },
  itemBody: {
    flex: 1,
    gap: spacing.xs
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  itemQuantity: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  itemMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  itemPrice: {
    color: colors.forest,
    fontSize: 18,
    fontWeight: "900"
  },
  itemRetail: {
    color: colors.faint,
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "line-through"
  },
  conditionPill: {
    backgroundColor: colors.paper2,
    borderRadius: 999,
    color: colors.forest,
    fontSize: 12,
    fontWeight: "800",
    maxWidth: 110,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  remove: {
    alignItems: "center",
    backgroundColor: colors.paper2,
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  removeDisabled: {
    opacity: 0.45
  },
  removeText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "900"
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.xl
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  inputError: {
    borderColor: colors.danger
  },
  fieldError: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    marginTop: -spacing.sm
  },
  checkoutIssue: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  disabledReason: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  policy: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    marginVertical: spacing.xl,
    padding: spacing.lg
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl
  },
  emptyMascot: {
    alignItems: "center",
    alignSelf: "center"
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  emptyMessage: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 24,
    maxWidth: 310,
    textAlign: "center"
  },
  emptyButton: {
    marginTop: spacing.sm,
    minWidth: 180
  },
  reminderText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: spacing.md,
    textAlign: "center"
  }
});
