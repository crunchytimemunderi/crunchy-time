"use client";

interface MessageBannerProps {
  message: string;
  type: "success" | "error";
}

/**
 * Shared message banner component for inline status messages.
 * Shows a colored banner at the top of forms.
 */
export default function MessageBanner({ message, type }: MessageBannerProps) {
  if (!message) return null;

  return (
    <div
      className={`mb-4 p-3 rounded-lg text-center font-medium ${
        type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {message}
    </div>
  );
}
