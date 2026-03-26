"use client";

import { getCurrentDate } from "@/utils/formatting";

interface DateNavigatorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  canGoNext: boolean;
  label?: string;
  accentColor?: "blue" | "red" | "green";
}

/**
 * Shared date navigation component with prev/next buttons and date picker.
 * Used by Sales, Expenses, and Cash pages.
 */
export default function DateNavigator({
  selectedDate,
  onDateChange,
  onPreviousDay,
  onNextDay,
  canGoNext,
  label = "📅 View Date:",
  accentColor = "blue",
}: DateNavigatorProps) {
  const focusColor = {
    blue: "focus:border-blue-500",
    red: "focus:border-red-500",
    green: "focus:border-green-500",
  }[accentColor];

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <button
        type="button"
        onClick={onPreviousDay}
        className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-lg text-gray-700 font-bold transition-colors"
        title="Previous Day"
      >
        ←
      </button>
      <input
        type="date"
        aria-label="View date"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        max={getCurrentDate()}
        className={`px-3 py-1.5 border-2 border-gray-300 rounded-lg text-sm text-gray-900 ${focusColor} focus:outline-none`}
      />
      <button
        type="button"
        onClick={onNextDay}
        disabled={!canGoNext}
        className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-lg text-gray-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Next Day"
      >
        →
      </button>
    </div>
  );
}
