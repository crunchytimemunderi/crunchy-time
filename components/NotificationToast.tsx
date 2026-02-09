"use client";

import { useEffect } from "react";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationToastProps {
  notification: Notification;
  onCloseAction: (id: string) => void;
}

export default function NotificationToast({
  notification,
  onCloseAction,
}: NotificationToastProps) {
  const { id, type, title, message, duration = 5000 } = notification;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onCloseAction(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onCloseAction]);

  const typeStyles = {
    success: "bg-green-600 border-green-700",
    error: "bg-red-600 border-red-700",
    warning: "bg-yellow-600 border-yellow-700",
    info: "bg-blue-600 border-blue-700",
  };

  const typeIcons = {
    success: "✓",
    error: "✕",
    warning: "⚠️",
    info: "ℹ️",
  };

  return (
    <div
      className={`${typeStyles[type]} text-white px-4 py-3 rounded-lg shadow-lg border-2 min-w-[300px] max-w-[400px] animate-slide-in`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          <span className="text-xl">{typeIcons[type]}</span>
          <div>
            <div className="font-bold">{title}</div>
            {message && <div className="text-sm mt-1 opacity-90">{message}</div>}
          </div>
        </div>
        <button
          onClick={() => onCloseAction(id)}
          className="text-white hover:opacity-80 text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
