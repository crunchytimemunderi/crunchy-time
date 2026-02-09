"use client";

import { useState } from "react";

export interface ShortcutItem {
  keys: string;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  shortcuts: ShortcutItem[];
}

export default function KeyboardShortcutsHelp({
  shortcuts,
}: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        title="Keyboard Shortcuts (Press ? to view)"
      >
        <span className="text-xl">⌨️</span>
      </button>

      {/* Help Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                ⌨️ Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <kbd className="px-3 py-1 text-sm font-mono font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500 whitespace-nowrap">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Press{" "}
              <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500">
                Esc
              </kbd>{" "}
              to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}
