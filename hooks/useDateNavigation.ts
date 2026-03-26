"use client";

import { useState, useCallback } from "react";
import { getCurrentDate, toLocalDateString } from "@/utils/formatting";

interface UseDateNavigationOptions {
  /** Allow navigating past today */
  allowFuture?: boolean;
  /** Initial date (defaults to today) */
  initialDate?: string;
}

export function useDateNavigation(options: UseDateNavigationOptions = {}) {
  const { allowFuture = false, initialDate } = options;
  const [selectedDate, setSelectedDate] = useState(
    () => initialDate || getCurrentDate()
  );

  const goToPreviousDay = useCallback(() => {
    const current = new Date(selectedDate + "T00:00:00");
    current.setDate(current.getDate() - 1);
    setSelectedDate(toLocalDateString(current));
  }, [selectedDate]);

  const goToNextDay = useCallback(() => {
    const current = new Date(selectedDate + "T00:00:00");
    current.setDate(current.getDate() + 1);
    const nextDate = toLocalDateString(current);
    const today = getCurrentDate();
    if (allowFuture || nextDate <= today) {
      setSelectedDate(nextDate);
    }
  }, [selectedDate, allowFuture]);

  const isToday = selectedDate === getCurrentDate();
  const canGoNext = allowFuture || selectedDate < getCurrentDate();

  return {
    selectedDate,
    setSelectedDate,
    goToPreviousDay,
    goToNextDay,
    isToday,
    canGoNext,
  };
}
