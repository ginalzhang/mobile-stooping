import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";

import { ORDER_LIMIT } from "../../constants/pickup";
import type { CartItem, CustomerInfo, OrderConfirmation } from "../../types/order";
import type { Product } from "../../types/product";

const CART_KEY = "stooping.cart.v1";
const CUSTOMER_KEY = "stooping.customer.v1";
const CONFIRMATION_KEY = "stooping.confirmation.v1";

type CartContextValue = {
  items: CartItem[];
  customer: CustomerInfo;
  confirmation: OrderConfirmation | null;
  checkoutLocked: boolean;
  totalQuantity: number;
  addItem: (product: Product) => { ok: boolean; message?: string };
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setCustomer: (customer: CustomerInfo) => void;
  setConfirmation: (confirmation: OrderConfirmation) => void;
  setCheckoutLocked: (locked: boolean) => void;
};

const emptyCustomer: CustomerInfo = {
  email: "",
  name: "",
  phone: ""
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomerState] = useState<CustomerInfo>(emptyCustomer);
  const [confirmation, setConfirmationState] = useState<OrderConfirmation | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [checkoutLocked, setCheckoutLockedState] = useState(false);
  const checkoutLockedRef = useRef(false);

  useEffect(() => {
    void hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  }, [customer, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (confirmation) {
      void AsyncStorage.setItem(CONFIRMATION_KEY, JSON.stringify(confirmation));
    }
  }, [confirmation, hydrated]);

  const hydrate = async () => {
    try {
      const [cartJson, customerJson, confirmationJson] = await Promise.all([
        AsyncStorage.getItem(CART_KEY),
        AsyncStorage.getItem(CUSTOMER_KEY),
        AsyncStorage.getItem(CONFIRMATION_KEY)
      ]);
      const savedItems = parseStoredValue(cartJson, isCartItemArray);
      const savedCustomer = parseStoredValue(customerJson, isCustomerInfo);
      const savedConfirmation = parseStoredValue(
        confirmationJson,
        isOrderConfirmation
      );

      if (savedItems) setItems(savedItems);
      if (savedCustomer) setCustomerState(savedCustomer);
      if (savedConfirmation) setConfirmationState(savedConfirmation);
    } catch {
      // Continue with default state if storage is temporarily unavailable.
    } finally {
      setHydrated(true);
    }
  };

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const addItem = useCallback(
    (product: Product) => {
      if (checkoutLockedRef.current) {
        return { ok: false, message: "Checkout is already in progress." };
      }
      if (!product.availableForSale) {
        return { ok: false, message: "This item is out of stock." };
      }
      if (totalQuantity >= ORDER_LIMIT) {
        return { ok: false, message: `Orders are limited to ${ORDER_LIMIT} items.` };
      }

      const existing = items.find((item) => item.product.variantId === product.variantId);
      if (existing && product.stockCount <= existing.quantity) {
        return {
          ok: false,
          message: "You already added the available stock for this item."
        };
      }

      setItems((current) => {
        const currentItem = current.find(
          (item) => item.product.variantId === product.variantId
        );
        if (!currentItem) return [...current, { product, quantity: 1 }];
        return current.map((item) =>
          item.product.variantId === product.variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      });

      return { ok: true };
    },
    [items, totalQuantity]
  );

  const removeItem = useCallback((variantId: string) => {
    if (checkoutLockedRef.current) return;
    setItems((current) => current.filter((item) => item.product.variantId !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    void AsyncStorage.removeItem(CART_KEY);
  }, []);

  const setCustomer = useCallback((nextCustomer: CustomerInfo) => {
    setCustomerState(nextCustomer);
  }, []);

  const setConfirmation = useCallback((nextConfirmation: OrderConfirmation) => {
    setConfirmationState(nextConfirmation);
  }, []);

  const setCheckoutLocked = useCallback((locked: boolean) => {
    checkoutLockedRef.current = locked;
    setCheckoutLockedState(locked);
  }, []);

  const value = useMemo(
    () => ({
      addItem,
      checkoutLocked,
      clearCart,
      confirmation,
      customer,
      items,
      removeItem,
      setCheckoutLocked,
      setConfirmation,
      setCustomer,
      totalQuantity
    }),
    [
      addItem,
      checkoutLocked,
      clearCart,
      confirmation,
      customer,
      items,
      removeItem,
      setCheckoutLocked,
      setConfirmation,
      setCustomer,
      totalQuantity
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}

function parseStoredValue<T>(
  json: string | null,
  validator: (value: unknown) => value is T
) {
  if (!json) return null;

  try {
    const value = JSON.parse(json) as unknown;
    return validator(value) ? value : null;
  } catch {
    return null;
  }
}

function isCartItemArray(value: unknown): value is CartItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        isProduct(item.product) &&
        isValidQuantity(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= ORDER_LIMIT
    ) &&
    value.reduce(
      (sum, item) =>
        sum + (isRecord(item) && isValidQuantity(item.quantity) ? item.quantity : 0),
      0
    ) <= ORDER_LIMIT
  );
}

function isCustomerInfo(value: unknown): value is CustomerInfo {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.phone === "string"
  );
}

function isOrderConfirmation(value: unknown): value is OrderConfirmation {
  return (
    isRecord(value) &&
    isCustomerInfo(value.customer) &&
    isCartItemArray(value.items) &&
    typeof value.confirmedAt === "string" &&
    (value.checkoutUrl === undefined || typeof value.checkoutUrl === "string")
  );
}

function isProduct(value: unknown): value is Product {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.variantId === "string" &&
    typeof value.handle === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    Array.isArray(value.images) &&
    value.images.every((image) => typeof image === "string") &&
    typeof value.price === "string" &&
    typeof value.estimatedRetailValue === "string" &&
    typeof value.condition === "string" &&
    typeof value.stockCount === "number" &&
    typeof value.availableForSale === "boolean" &&
    typeof value.category === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidQuantity(value: unknown): value is number {
  return Number.isInteger(value);
}
