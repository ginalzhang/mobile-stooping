import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
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
import { useCart } from "./CartContext";

type Props = NativeStackScreenProps<OrderStackParamList, "OrderHome">;

export function CartScreen({ navigation }: Props) {
  const {
    clearCart,
    customer,
    items,
    removeItem,
    setConfirmation,
    setCustomer,
    totalQuantity
  } = useCart();
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(customer.phone);
  const [checkingOut, setCheckingOut] = useState(false);

  const customerValid = useMemo(
    () => name.trim() && email.includes("@") && phone.trim().length >= 7,
    [email, name, phone]
  );
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
    if (!items.length) return;
    if (!customerValid) {
      Alert.alert("Contact info needed", "Add your name, email, and phone first.");
      return;
    }

    setCheckingOut(true);
    try {
      const latestProducts = await Promise.all(
        items.map((item) =>
          fetchProduct({ id: item.product.id, handle: item.product.handle })
        )
      );
      const unavailable = items.find((item, index) => {
        const latest = latestProducts[index];
        return !latest || !latest.availableForSale || latest.stockCount < item.quantity;
      });

      if (unavailable) {
        Alert.alert(
          "Stock changed",
          `${unavailable.product.title} is no longer available in the requested quantity.`
        );
        return;
      }

      const nextCustomer = {
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim()
      };
      setCustomer(nextCustomer);

      const cart = await createShopifyCart({
        customer: nextCustomer,
        items,
        note: `Stooping Club mobile order. Pickup: ${DEFAULT_PICKUP.window} at ${DEFAULT_PICKUP.address}`
      });

      if (cart.checkoutUrl) {
        await WebBrowser.openBrowserAsync(cart.checkoutUrl);
      }

      setConfirmation({
        checkoutUrl: cart.checkoutUrl,
        confirmedAt: new Date().toISOString(),
        customer: nextCustomer,
        items
      });
      clearCart();
      navigation.navigate("Confirmation");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Checkout could not be started.";
      Alert.alert("Checkout failed", message);
    } finally {
      setCheckingOut(false);
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
              onPress={() => removeItem(item.product.variantId)}
              style={styles.remove}
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
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={name}
        />
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={email}
        />
        <TextInput
          accessibilityLabel="Phone"
          keyboardType="phone-pad"
          onChangeText={setPhone}
          placeholder="Phone"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={phone}
        />
      </View>
      <PickupPolicy />
      <AppButton
        label={`Reserve ${totalQuantity} ${totalQuantity === 1 ? "find" : "finds"} for Sunday`}
        loading={checkingOut}
        disabled={!items.length}
        onPress={checkout}
      />
      <Text style={styles.reminderText}>
        We’ll text a reminder Friday to confirm, and Sunday before pickup.
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
