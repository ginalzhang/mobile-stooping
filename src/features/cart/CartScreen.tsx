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
import { BrandLogo } from "../../components/BrandLogo";
import { Screen } from "../../components/Screen";
import { StateView } from "../../components/StateView";
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
        <View style={styles.emptyBrand}>
          <BrandLogo size="large" />
        </View>
        <StateView
          title="Your order is empty"
          message="Browse the shop and add up to 10 free finds."
        />
        <PickupPolicy />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.h1}>Your order</Text>
        <Text style={styles.limit}>
          {totalQuantity}/{ORDER_LIMIT} items. One order per week per person.
        </Text>
      </View>
      <View style={styles.items}>
        {items.map((item) => (
          <View key={item.product.variantId} style={styles.itemRow}>
            {item.product.images[0] ? (
              <Image source={{ uri: item.product.images[0] }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]} />
            )}
            <View style={styles.itemBody}>
              <Text numberOfLines={2} style={styles.itemTitle}>
                {item.product.title}
              </Text>
              <Text style={typography.caption}>Qty {item.quantity} · $0.00</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.product.title}`}
              onPress={() => removeItem(item.product.variantId)}
              style={styles.remove}
            >
              <Text style={styles.removeText}>Remove</Text>
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
        label="Confirm order"
        loading={checkingOut}
        disabled={!items.length}
        onPress={checkout}
      />
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
  items: {
    gap: spacing.md
  },
  itemRow: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  thumb: {
    backgroundColor: "#ECE7DD",
    borderRadius: 6,
    height: 72,
    width: 72
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
    fontWeight: "800"
  },
  remove: {
    minHeight: 44,
    justifyContent: "center"
  },
  removeText: {
    color: colors.danger,
    fontWeight: "800"
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
  emptyBrand: {
    alignItems: "center",
    marginBottom: spacing.lg
  }
});
