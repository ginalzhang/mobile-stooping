import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { AppButton } from "../../components/AppButton";
import { Screen } from "../../components/Screen";
import { StateView } from "../../components/StateView";
import { StoopyMascot } from "../../components/StoopyMascot";
import { DEFAULT_PICKUP } from "../../constants/pickup";
import { colors } from "../../theme/colors";
import { spacing, typography } from "../../theme/theme";
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

  const orderCode = createOrderCode(confirmation.confirmedAt);
  const itemCount = confirmation.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Screen>
      <View style={styles.hero}>
        <StoopyMascot caption="Pickup pal" size="small" />
        <Text style={styles.check}>✓</Text>
        <Text style={typography.h1}>Order started</Text>
        <Text style={typography.body}>
          Finish Shopify checkout if it opened, then watch for Stooping Club’s text or
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
            <Text style={styles.passTitle}>Pickup pass</Text>
            <Text style={styles.passSubtitle}>Stooping Club Berkeley</Text>
          </View>
          <StoopyMascot caption="" size="small" />
        </View>
        <View style={styles.passBody}>
          <View style={styles.qrBox}>
            <QRCode
              value={JSON.stringify({
                code: orderCode,
                pickup: DEFAULT_PICKUP.label,
                items: itemCount
              })}
              size={132}
              color={colors.ink}
              backgroundColor={colors.card}
            />
          </View>
          <Text style={styles.orderCode}>{orderCode}</Text>
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

function createOrderCode(confirmedAt: string): string {
  const timestamp = Number.isFinite(Date.parse(confirmedAt))
    ? Date.parse(confirmedAt)
    : Date.now();

  return `STOOP-${Math.abs(timestamp).toString(36).slice(-6).toUpperCase()}`;
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.forest,
    borderRadius: 8,
    gap: spacing.sm,
    padding: spacing.xl
  },
  check: {
    color: colors.lime,
    fontSize: 44,
    fontWeight: "900"
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.lg
  },
  pass: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
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
  qrBox: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  orderCode: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: spacing.lg
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
