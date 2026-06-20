import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import {
  confirmReservation,
  getReservation,
  releaseReservation,
  type Reservation,
  type ReservationStatus
} from "../../api/reservations";
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

export function ConfirmationScreen({ navigation, route }: Props) {
  const { confirmation } = useCart();
  const reservationId = route.params?.reservationId ?? confirmation?.reservationId;
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [actionLoading, setActionLoading] = useState<"confirm" | "release" | null>(null);

  const refreshReservation = useCallback(async () => {
    if (!reservationId) return;

    setLoadingStatus(true);
    try {
      setReservation(await getReservation(reservationId));
    } catch {
      // The local pass remains useful if the status check is temporarily unavailable.
    } finally {
      setLoadingStatus(false);
    }
  }, [reservationId]);

  useEffect(() => {
    void refreshReservation();

    if (!reservationId) return undefined;

    const interval = setInterval(() => {
      void refreshReservation();
    }, 20000);

    return () => clearInterval(interval);
  }, [refreshReservation, reservationId]);

  if (!confirmation && !reservationId) {
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

  const itemCount =
    confirmation?.items.reduce((sum, item) => sum + item.quantity, 0) ??
    reservation?.items?.length ??
    0;
  const status = reservation?.status ?? confirmation?.reservationStatus ?? "held";
  const statusCopy = getStatusCopy(status, reservation?.pickupAt ?? confirmation?.pickupAt);
  const canConfirm = status === "held" && Boolean(reservationId);
  const canRelease = (status === "held" || status === "confirmed") && Boolean(reservationId);

  const handleConfirm = async () => {
    if (!reservationId) return;

    setActionLoading("confirm");
    try {
      setReservation(await confirmReservation(reservationId));
    } catch (error) {
      Alert.alert(
        "Could not confirm",
        error instanceof Error ? error.message : "Try again in a moment."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = () => {
    if (!reservationId) return;

    Alert.alert(
      "Release these finds?",
      "They will go back up for other neighbors.",
      [
        { text: "Keep hold", style: "cancel" },
        {
          text: "Release",
          style: "destructive",
          onPress: () => {
            void releaseCurrentReservation(reservationId);
          }
        }
      ]
    );
  };

  const releaseCurrentReservation = async (id: string) => {
    setActionLoading("release");
    try {
      setReservation(await releaseReservation(id));
    } catch (error) {
      Alert.alert(
        "Could not release",
        error instanceof Error ? error.message : "Try again in a moment."
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <StoopyMascot caption="Pickup pal" size="small" />
        <Text style={styles.check}>✓</Text>
        <Text style={typography.h1}>{statusCopy.title}</Text>
        <Text style={typography.body}>{statusCopy.message}</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={typography.h2}>Pickup</Text>
          {loadingStatus ? <Text style={styles.syncText}>Syncing</Text> : null}
        </View>
        <Text style={typography.body}>
          {DEFAULT_PICKUP.window} at {DEFAULT_PICKUP.address}
        </Text>
        <Text style={typography.body}>{statusCopy.detail}</Text>
        {canConfirm ? (
          <AppButton
            label="I'll be there"
            loading={actionLoading === "confirm"}
            onPress={handleConfirm}
          />
        ) : null}
        {canRelease ? (
          <AppButton
            label="Can't make it - release my finds"
            loading={actionLoading === "release"}
            onPress={handleRelease}
            variant="danger"
          />
        ) : null}
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
          <Text style={styles.pickupName}>
            {confirmation?.customer.name ?? "Your name"}
          </Text>
          <Text style={styles.codeHelp}>Give your name when you arrive.</Text>
          <View style={styles.passMeta}>
            <PassCol label="When" value={DEFAULT_PICKUP.window} />
            <PassCol label="Where" value="El Cerrito" />
            <PassCol label="Items" value={String(itemCount)} />
          </View>
        </View>
      </View>
      {confirmation?.items.length ? (
        <View style={styles.card}>
          <Text style={typography.h2}>Items</Text>
          {confirmation.items.map((item) => (
            <Text key={item.product.variantId} style={typography.body}>
              {item.quantity} x {item.product.title}
            </Text>
          ))}
        </View>
      ) : null}
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

function getStatusCopy(
  status: ReservationStatus | string,
  pickupAt?: string
): { title: string; message: string; detail: string } {
  if (status === "released") {
    return {
      title: "Released",
      message: "These finds were released from your order.",
      detail: "They can now be claimed by other neighbors."
    };
  }

  if (status === "confirmed") {
    const pickupStarted = pickupAt ? Date.now() >= Date.parse(pickupAt) : false;

    return {
      title: pickupStarted ? "Pickup today" : "Confirmed",
      message: pickupStarted
        ? "Give your name at pickup today."
        : "You are confirmed for Sunday pickup.",
      detail: "Give your name when you arrive. If plans change, release your finds."
    };
  }

  return {
    title: "Confirm by Friday",
    message: "Use the Friday notification or tap below to keep your finds.",
    detail: "The team handles any release or relisting manually."
  };
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
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  syncText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
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
  pickupName: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center"
  },
  codeHelp: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.sm,
    textAlign: "center"
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
