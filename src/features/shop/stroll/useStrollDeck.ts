import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CartItem } from "../../../types/order";
import type { Product } from "../../../types/product";

export type StrollMood = "walk" | "wave" | "cheer";
export type StrollSpeechTone = "neutral" | "skip" | "cheer";
export type StrollSpeech = {
  text: string;
  tone: StrollSpeechTone;
  key: number;
};

type UseStrollDeckInput = {
  products: Product[];
  cartItems: CartItem[];
  hasNextPage?: boolean;
  onNeedMoreProducts?: () => void;
  resetKey: string;
};

const skipLines = [
  "Next one's down the block.",
  "Ooh, keep strolling.",
  "Found another for you.",
  "One more curb to check.",
  "Stoopy will keep looking."
];

const reserveLines = [
  "It's yours. Nice grab.",
  "Reserved - see you Sunday.",
  "Good eye. Saved for you.",
  "That one's off the curb."
];

export function useStrollDeck({
  cartItems,
  hasNextPage,
  onNeedMoreProducts,
  products,
  resetKey
}: UseStrollDeckInput) {
  const [queue, setQueue] = useState<string[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [mood, setMood] = useState<StrollMood>("walk");
  const [speech, setSpeech] = useState<StrollSpeech>({
    key: 0,
    text: "Stoopy found you something.",
    tone: "neutral"
  });
  const [celebrationKey, setCelebrationKey] = useState(0);
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedMore = useRef(false);

  const quantityByVariant = useMemo(() => {
    const quantities = new Map<string, number>();
    cartItems.forEach((item) => {
      quantities.set(
        item.product.variantId,
        (quantities.get(item.product.variantId) ?? 0) + item.quantity
      );
    });
    return quantities;
  }, [cartItems]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  const candidateIds = useMemo(
    () =>
      products
        .filter((product) => {
          const quantityInCart = quantityByVariant.get(product.variantId) ?? 0;
          return (
            product.availableForSale &&
            Boolean(product.variantId.trim()) &&
            product.stockCount > 0 &&
            quantityInCart === 0 &&
            !seenIds.includes(product.id)
          );
        })
        .map((product) => product.id),
    [products, quantityByVariant, seenIds]
  );

  useEffect(() => {
    setSeenIds([]);
    setQueue([]);
    setMood("walk");
    setSpeech({
      key: Date.now(),
      text: "Stoopy found you something.",
      tone: "neutral"
    });
  }, [resetKey]);

  useEffect(() => {
    setSeenIds((current) => {
      const knownProductIds = new Set(products.map((product) => product.id));
      return current.filter((id) => knownProductIds.has(id));
    });
  }, [products]);

  useEffect(() => {
    setQueue((current) => {
      const candidates = new Set(candidateIds);
      const kept = current.filter((id) => candidates.has(id));
      const additions = candidateIds.filter((id) => !kept.includes(id));
      return [...kept, ...shuffle(additions)];
    });
  }, [candidateIds]);

  useEffect(() => {
    requestedMore.current = false;
  }, [products.length, resetKey]);

  useEffect(() => {
    if (queue.length > 3) {
      requestedMore.current = false;
    }

    if (queue.length <= 2 && hasNextPage && !requestedMore.current) {
      requestedMore.current = true;
      onNeedMoreProducts?.();
    }
  }, [hasNextPage, onNeedMoreProducts, queue.length]);

  useEffect(() => {
    return () => {
      if (moodTimer.current) {
        clearTimeout(moodTimer.current);
      }
    };
  }, []);

  const visibleProducts = useMemo(
    () =>
      queue
        .slice(0, 3)
        .map((id) => productById.get(id))
        .filter((product): product is Product => Boolean(product)),
    [productById, queue]
  );

  const setTemporaryMood = useCallback((nextMood: StrollMood) => {
    if (moodTimer.current) {
      clearTimeout(moodTimer.current);
    }

    setMood(nextMood);
    moodTimer.current = setTimeout(() => setMood("walk"), nextMood === "cheer" ? 1100 : 750);
  }, []);

  const markSkipped = useCallback((product: Product) => {
    setSeenIds((current) => addUnique(current, product.id));
    setTemporaryMood("wave");
    setSpeech({
      key: Date.now(),
      text: pick(skipLines),
      tone: "skip"
    });
  }, [setTemporaryMood]);

  const markReserved = useCallback((product: Product) => {
    setSeenIds((current) => addUnique(current, product.id));
    setTemporaryMood("cheer");
    setCelebrationKey(Date.now());
    setSpeech({
      key: Date.now(),
      text: pick(reserveLines),
      tone: "cheer"
    });
  }, [setTemporaryMood]);

  const reset = useCallback(() => {
    setSeenIds([]);
    setQueue(shuffle(candidateIds));
    setMood("walk");
    setSpeech({
      key: Date.now(),
      text: "Stoopy found you something.",
      tone: "neutral"
    });
  }, [candidateIds]);

  const hasAvailableProducts = products.some((product) => {
    const quantityInCart = quantityByVariant.get(product.variantId) ?? 0;
    return (
      product.availableForSale &&
      Boolean(product.variantId.trim()) &&
      product.stockCount > 0 &&
      quantityInCart === 0
    );
  });

  return {
    celebrationKey,
    goal: Math.max(10, products.length),
    hasAvailableProducts,
    markReserved,
    markSkipped,
    mood,
    reset,
    seenCount: seenIds.length,
    speech,
    visibleProducts
  };
}

function addUnique(values: string[], value: string) {
  return values.includes(value) ? values : [...values, value];
}

function pick(lines: string[]) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function shuffle<T>(items: T[]) {
  const nextItems = [...items];
  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }
  return nextItems;
}
