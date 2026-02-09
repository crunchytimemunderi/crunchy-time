"use client";

import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);
}

// Common shortcuts helper
export const createShortcuts = {
  newItem: (handler: () => void): KeyboardShortcut => ({
    key: "n",
    ctrl: true,
    handler,
    description: "New item (Ctrl+N)",
  }),
  save: (handler: () => void): KeyboardShortcut => ({
    key: "s",
    ctrl: true,
    handler,
    description: "Save (Ctrl+S)",
  }),
  search: (handler: () => void): KeyboardShortcut => ({
    key: "f",
    ctrl: true,
    handler,
    description: "Search (Ctrl+F)",
  }),
  cancel: (handler: () => void): KeyboardShortcut => ({
    key: "Escape",
    handler,
    description: "Cancel (Esc)",
  }),
  export: (handler: () => void): KeyboardShortcut => ({
    key: "e",
    ctrl: true,
    handler,
    description: "Export (Ctrl+E)",
  }),
};
