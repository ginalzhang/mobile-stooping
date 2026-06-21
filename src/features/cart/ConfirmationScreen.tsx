import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { Screen } from "../../components/Screen";
import { StateView } from "../../components/StateView";
import { StoopyMascot } from "../../components/StoopyMascot";
import { DEFAULT_PICKUP } from "../../constants/pickup";
import { colors } from "../../theme/colors";
import { radii, spacing, typography } from "../../theme/theme";
import type { OrderStackParamList } from "../../navigation/types";
import { NotificationPanel } from "../notifications/NotificationPanel";
import { useCart } from "./CartContext";

type Props = NativeStackScreenProps<OrderStackParamList, "Confirmation">;

export function ConfirmationScreen({ navigation }: Props) {
  const { confirmation } = useCart();

  if (!confirmation) {
    return (
      <Screen>
        <StateView
          title="No recent confirmation"
          message="Place an order first, then come back here for pickup reminders."
          actionLabel="Back to order"
          onAction={() => navigation.navigate("OrderHome")}
        />
      </Screen>
    );
  }

  const itemCount = confirmation.items.reduce((sum, item) => sum + item.quantity, 0);
  const openCheckout = () => {
    if (confirmation.checkoutUrl) {
      void WebBrowser.openBrowserAsync(confirmation.checkoutUrl);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <StoopyMascot caption="" containerStyle={styles.heroMascot} size="tiny" />
        <Text style={styles.heroEyebrow}>Order started</Text>
        <View style={styles.checkBadge}>
          <Text style={styles.check}>✓</Text>
        </View>
        <Text style={styles.heroTitle}>You're in line for pickup</Text>
        <Text style={styles.heroBody}>
          Finish Shopify checkout if it opened, then watch for Stooping Club's text or
          email confirmation.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={typography.h2}>Pickup</Text>
        <Text style={typography.body}>
          {DEFAULT_PICKUP.window} at {DEFAULT_PICKUP.address}
        </Text>
        <Text style={typography.body}>
          Reply by Friday end of day or your order may be canceled and relisted.
        </Text>
      </View>
      <View style={styles.pass}>
        <View style={styles.passHeader}>
          <View>
            <Text style={styles.passTitle}>Shopify confirmation</Text>
            <Text style={styles.passSubtitle}>Stooping Club Berkeley</Text>
          </View>
          <StoopyMascot caption="" size="small" />
        </View>
        <View style={styles.passBody}>
          <Text style={styles.shopifyLabel}>Use Shopify at pickup</Text>
          <Text style={styles.shopifyTitle}>Bring your Shopify confirmation</Text>
          <Text style={styles.shopifyBody}>
            After checkout, use Shopify's confirmation email or order status page at
            pickup. Staff can look up the paid order in Shopify by name or email.
          </Text>
          {confirmation.checkoutUrl ? (
            <AppButton
              label="Open Shopify checkout"
              onPress={openCheckout}
              style={styles.checkoutButton}
              variant="accent"
            />
          ) : null}
          <View style={styles.passMeta}>
            <PassCol label="When" value={DEFAULT_PICKUP.window} />
            <PassCol label="Where" value="El Cerrito" />
            <PassCol label="Items" value={String(itemCount)} />
          </View>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={typography.h2}>Items</Text>
        {confirmation.items.map((item) => (
          <Text key={item.product.variantId} style={typography.body}>
            {item.quantity} × {item.product.title}
          </Text>
        ))}
      </View>
      <NotificationPanel />
      <AppButton
        label="Back to order"
        variant="secondary"
        onPress={() => navigation.navigate("OrderHome")}
      />
    </Screen>
  );
}

function PassCol({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.passCol}>
      <Text style={styles.passLabel}>{label}</Text>
      <Text style={styles.passValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.forest,
    borderRadius: radii.card,
    gap: spacing.sm,
    overflow: "hidden",
    padding: spacing.xl,
    paddingRight: 104,
    position: "relative"
  },
  heroMascot: {
    position: "absolute",
    right: spacing.lg,
    top: spacing.lg
  },
  heroEyebrow: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  checkBadge: {
    alignItems: "center",
    backgroundColor: colors.lime,
    borderRadius: radii.pill,
    height: 38,
    justifyContent: "center",
    marginTop: spacing.xs,
    width: 38
  },
  check: {
    color: colors.forest,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28
  },
  heroTitle: {
    color: colors.cream,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 30
  },
  heroBody: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  pass: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    marginTop: spacing.lg,
    overflow: "hidden"
  },
  passHeader: {
    alignItems: "center",
    backgroundColor: colors.forest,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg
  },
  passTitle: {
    color: colors.card,
    fontSize: 18,
    fontWeight: "900"
  },
  passSubtitle: {
    color: colors.lime,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  passBody: {
    alignItems: "center",
    padding: spacing.xl
  },
  shopifyLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.66,
    textAlign: "center",
    textTransform: "uppercase"
  },
  shopifyTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 27,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  shopifyBody: {
    color: colors.ink2,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  checkoutButton: {
    marginTop: spacing.lg,
    width: "100%"
  },
  passMeta: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    width: "100%"
  },
  passCol: {
    alignItems: "center",
    flex: 1
  },
  passLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  passValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    marginTop: spacing.xs,
    textAlign: "center"
  }
});
