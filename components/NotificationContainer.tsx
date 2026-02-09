"use client";

import { useEffect, useState } from "react";
import NotificationToast, { Notification } from "./NotificationToast";
import { notifications } from "@/lib/notifications";

export default function NotificationContainer() {
  const [notificationList, setNotificationList] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notifications.subscribe((notification) => {
      setNotificationList((prev) => [...prev, notification]);
    });

    return unsubscribe;
  }, []);

  const removeNotification = (id: string) => {
    setNotificationList((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {notificationList.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onCloseAction={removeNotification}
        />
      ))}
    </div>
  );
}
