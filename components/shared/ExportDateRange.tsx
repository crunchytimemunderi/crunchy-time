"use client";

import { getCurrentDate } from "@/utils/formatting";

interface ExportDateRangeProps {
  show: boolean;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

/**
 * Shared export date range picker.
 * Used by sales and expenses export features.
 */
export default function ExportDateRange({
  show,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: ExportDateRangeProps) {
  if (!show) return null;

  return (
    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="text-sm font-bold text-blue-800 mb-2">
        Select Date Range for Export
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-700 block mb-1">
            Start Date
          </label>
          <input
            type="date"
            aria-label="Export start date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            max={getCurrentDate()}
            className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-700 block mb-1">
            End Date
          </label>
          <input
            type="date"
            aria-label="Export end date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            max={getCurrentDate()}
            min={startDate}
            className="w-full px-2 py-1.5 border-2 border-gray-300 rounded-lg text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
