import {
  getAlerts,
  listNotifications,
  markAllNotificationsRead,
} from "@/server/services/notifications";
import { ok } from "@/server/http";
import { withUser } from "@/server/route-helpers";

/** Stored notifications plus live "needs attention" alerts. */
export async function GET() {
  return withUser(async (user) => {
    const [notifications, alerts] = await Promise.all([
      listNotifications(user.id),
      getAlerts(user.id),
    ]);
    return ok({
      notifications,
      alerts,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  });
}

/** Mark every notification read. */
export async function PATCH() {
  return withUser(async (user) => ok(await markAllNotificationsRead(user.id)));
}
