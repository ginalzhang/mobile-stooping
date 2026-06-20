import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Linking, Platform, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { AppButton } from "../../components/AppButton";
import { Screen } from "../../components/Screen";
import { StateView } from "../../components/StateView";
import { StoopyMascot } from "../../components/StoopyMascot";
import { DEFAULT_PICKUP } from "../../constants/pickup";
import { colors } from "../../theme/colors";
import { spacing, typography } from "../../theme/theme";
import type { OrderStackParamList } from "../../navigation/types";
import type { CartItem } from "../../types/order";
import { NotificationPanel } from "../notifications/NotificationPanel";
import {
  formatPickupWindow,
  getPickupReminderSchedule
} from "../notifications/notificationUtils";
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
  const itemSummary = createItemSummary(confirmation.items);
  const pickupSchedule = getPickupReminderSchedule(confirmation.confirmedAt);
  const pickupWindow = formatPickupWindow(pickupSchedule);
  const checkoutStarted = Boolean(confirmation.checkoutUrl);

  return (
    <Screen>
      <View style={styles.hero}>
        <StoopyMascot caption="Pickup pal" size="small" />
        <Text style={styles.check}>✓</Text>
        <Text style={typography.h1}>
          {checkoutStarted ? "Checkout started" : "Pickup request saved"}
        </Text>
        <Text style={typography.body}>
          {checkoutStarted
            ? "Shopify checkout opened in your browser. Finish checkout there, then watch for Stooping Club’s text or email confirmation."
            : "We saved this pickup request locally. Watch for Stooping Club’s text or email confirmation before pickup."}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={typography.h2}>Pickup</Text>
        <Text style={typography.body}>{pickupWindow}</Text>
        <Text style={typography.body}>{DEFAULT_PICKUP.address}</Text>
        <Text style={typography.body}>
          Reply to Stooping Club confirmation messages promptly or your order may be
          canceled and relisted.
        </Text>
        <View style={styles.actionRow}>
          <AppButton
            label="Open Maps"
            onPress={openPickupMaps}
            style={styles.actionButton}
            variant="secondary"
          />
          <AppButton
            label="Add to Calendar"
            onPress={() => openCalendarEvent(orderCode, itemSummary, pickupSchedule)}
            style={styles.actionButton}
            variant="secondary"
          />
        </View>
      </View>
      <View style={styles.pass}>
        <View style={styles.passHeader}>
          <View>
            <Text style={styles.passTitle}>Pickup pass</Text>
            <Text style={styles.passSubtitle}>Stooping Club pickup</Text>
          </View>
          <StoopyMascot caption="" size="small" />
        </View>
        <View style={styles.passBody}>
          <View style={styles.qrBox}>
            <QRCode
              value={JSON.stringify({
                code: orderCode,
                customer: confirmation.customer.name,
                fallbackCode: orderCode,
                itemSummary,
                pickup: DEFAULT_PICKUP.label,
                pickupStartsAt: pickupSchedule.pickupStartsAt,
                items: itemCount
              })}
              size={132}
              color={colors.ink}
              backgroundColor={colors.card}
            />
          </View>
          <Text style={styles.orderCode}>{orderCode}</Text>
          <Text style={styles.fallbackCode}>QR fallback code</Text>
          <View style={styles.passMeta}>
            <PassCol label="Name" value={confirmation.customer.name || "Guest"} />
            <PassCol label="Items" value={String(itemCount)} />
            <PassCol label="Where" value="El Cerrito" />
          </View>
          <View style={styles.passDetails}>
            <PassRow label="Summary" value={itemSummary} />
            <PassRow label="Window" value={pickupWindow} />
            <PassRow label="Address" value={DEFAULT_PICKUP.address} />
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
      <NotificationPanel confirmation={confirmation} orderCode={orderCode} />
      <AppButton
        label="Back to order"
        variant="secondary"
        onPress={() => navigation.navigate("OrderHome")}
      />
    </Screen>
  );
}

type PickupScheduleForLinks = {
  pickupStartsAt: string;
  pickupEndsAt: string;
};

function PassCol({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.passCol}>
      <Text style={styles.passLabel}>{label}</Text>
      <Text style={styles.passValue}>{value}</Text>
    </View>
  );
}

function PassRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.passRow}>
      <Text style={styles.passRowLabel}>{label}</Text>
      <Text style={styles.passRowValue}>{value}</Text>
    </View>
  );
}

function createOrderCode(confirmedAt: string): string {
  const timestamp = Number.isFinite(Date.parse(confirmedAt))
    ? Date.parse(confirmedAt)
    : Date.now();

  return `STOOP-${Math.abs(timestamp).toString(36).slice(-6).toUpperCase()}`;
}

function createItemSummary(items: CartItem[]): string {
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const titles = items.map((item) => item.product.title);
  const firstTwo = titles.slice(0, 2).join(", ");
  const extraCount = titles.length - 2;

  return `${count} ${count === 1 ? "item" : "items"}: ${firstTwo}${extraCount > 0 ? ` + ${extraCount} more` : ""}`;
}

async function openPickupMaps() {
  const query = encodeURIComponent(DEFAULT_PICKUP.address);
  const nativeUrl = Platform.select({
    ios: `maps:?q=${query}`,
    android: `geo:0,0?q=${query}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}`
  });
  const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  await openUrl(nativeUrl ?? fallbackUrl, fallbackUrl);
}

async function openCalendarEvent(
  orderCode: string,
  itemSummary: string,
  schedule: PickupScheduleForLinks
) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Stooping Club pickup ${orderCode}`,
    dates: `${formatGoogleCalendarDate(schedule.pickupStartsAt)}/${formatGoogleCalendarDate(schedule.pickupEndsAt)}`,
    details: `${itemSummary}\nFallback code: ${orderCode}`,
    location: DEFAULT_PICKUP.address
  });

  await openUrl(`https://calendar.google.com/calendar/render?${params.toString()}`);
}

async function openUrl(url: string, fallbackUrl?: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return;
    }

    if (fallbackUrl) {
      await Linking.openURL(fallbackUrl);
      return;
    }
  } catch {
    // Fall through to the user-visible alert.
  }

  Alert.alert("Could not open link", "Try again from a browser or maps app.");
}

function formatGoogleCalendarDate(isoDate: string): string {
  return new Date(isoDate).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
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
  fallbackCode: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.xs,
    textTransform: "uppercase"
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
  passDetails: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    width: "100%"
  },
  passRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  passRowLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    width: 72
  },
  passRowValue: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19
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
