import { Notification } from "@/components/NotificationToast";

type NotificationListener = (notification: Notification) => void;

class NotificationManager {
  private listeners: NotificationListener[] = [];
  private idCounter = 0;

  subscribe(listener: NotificationListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(notification: Omit<Notification, "id">) {
    const notificationWithId = {
      ...notification,
      id: `notification-${++this.idCounter}`,
    };
    this.listeners.forEach((listener) => listener(notificationWithId));
  }

  success(title: string, message?: string, duration?: number) {
    this.emit({ type: "success", title, message, duration });
  }

  error(title: string, message?: string, duration?: number) {
    this.emit({ type: "error", title, message, duration });
  }

  warning(title: string, message?: string, duration?: number) {
    this.emit({ type: "warning", title, message, duration });
  }

  info(title: string, message?: string, duration?: number) {
    this.emit({ type: "info", title, message, duration });
  }

  // Business logic notifications
  lowStockAlert(itemName: string, currentStock: number, minStock: number) {
    this.warning(
      "Low Stock Alert",
      `${itemName}: ${currentStock} ${currentStock === 1 ? "unit" : "units"} left (min: ${minStock})`,
      10000
    );
  }

  cashDiscrepancy(expected: number, actual: number, difference: number) {
    if (Math.abs(difference) > 100) {
      this.warning(
        "Large Cash Difference",
        `Expected: ₹${expected.toLocaleString("en-IN")}, Actual: ₹${actual.toLocaleString("en-IN")}, Difference: ₹${Math.abs(difference).toLocaleString("en-IN")}`,
        15000
      );
    }
  }

  reconciliationReminder() {
    this.info(
      "End of Day Reminder",
      "Don't forget to complete today's cash reconciliation!",
      0 // Don't auto-dismiss
    );
  }
}

export const notifications = new NotificationManager();
