import { NotificationPermissionCard } from "./NotificationPermissionCard";
import {
  buildReminderOrderDetails,
  type ReminderOrderDetails
} from "./notificationUtils";
import type { OrderConfirmation } from "../../types/order";

type NotificationPanelProps = {
  confirmation?: OrderConfirmation | null;
  orderCode?: string;
  order?: ReminderOrderDetails;
};

export function NotificationPanel({
  confirmation,
  order,
  orderCode
}: NotificationPanelProps) {
  const reminderOrder =
    order ??
    (confirmation && orderCode
      ? buildReminderOrderDetails(confirmation, orderCode)
      : undefined);

  return <NotificationPermissionCard order={reminderOrder} />;
}
