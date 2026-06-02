import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";

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
  }
});
