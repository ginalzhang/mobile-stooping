import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  totalQuantity: number;
  addItem: (product: Product) => { ok: boolean; message?: string; reason?: "order_limit" };
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setCustomer: (customer: CustomerInfo) => void;
  setConfirmation: (confirmation: OrderConfirmation) => void;
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

  useEffect(() => {
    void hydrate();
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    void AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  }, [customer]);

  useEffect(() => {
    if (confirmation) {
      void AsyncStorage.setItem(CONFIRMATION_KEY, JSON.stringify(confirmation));
    }
  }, [confirmation]);

  const hydrate = async () => {
    const [cartJson, customerJson, confirmationJson] = await Promise.all([
      AsyncStorage.getItem(CART_KEY),
      AsyncStorage.getItem(CUSTOMER_KEY),
      AsyncStorage.getItem(CONFIRMATION_KEY)
    ]);
    if (cartJson) setItems(JSON.parse(cartJson) as CartItem[]);
    if (customerJson) setCustomerState(JSON.parse(customerJson) as CustomerInfo);
    if (confirmationJson) {
      setConfirmationState(JSON.parse(confirmationJson) as OrderConfirmation);
    }
  };

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const addItem = useCallback(
    (product: Product) => {
      if (!product.availableForSale) {
        return { ok: false, message: "This item is out of stock." };
      }
      if (totalQuantity >= ORDER_LIMIT) {
        return {
          ok: false,
          message: `Orders are limited to ${ORDER_LIMIT} items.`,
          reason: "order_limit" as const
        };
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

  const value = useMemo(
    () => ({
      addItem,
      clearCart,
      confirmation,
      customer,
      items,
      removeItem,
      setConfirmation,
      setCustomer,
      totalQuantity
    }),
    [
      addItem,
      clearCart,
      confirmation,
      customer,
      items,
      removeItem,
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
