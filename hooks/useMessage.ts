"use client";

import { useState, useCallback } from "react";
import { notifications } from "@/lib/notifications";

/**
 * Reusable message/notification hook.
 * Shows a toast notification and also maintains legacy message state.
 */
export function useMessage() {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const showMessage = useCallback(
    (type: "success" | "error", text: string) => {
      if (type === "success") {
        notifications.success(text);
      } else {
        notifications.error(text);
      }
      setMessageType(type);
      setMessage(text);
      setTimeout(() => setMessage(""), 4000);
    },
    []
  );

  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);

  return { message, messageType, showMessage, clearMessage };
}
