"use client";

interface PaymentMethodSelectorProps {
  selected: string;
  onChange: (method: string) => void;
}

/**
 * Shared payment method selector (Cash / UPI).
 * Used by sales and expenses forms.
 */
export default function PaymentMethodSelector({
  selected,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-1">
        💳 Payment Method
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange("cash")}
          className={`p-3 rounded-lg border-2 font-medium transition-all ${
            selected === "cash"
              ? "bg-green-600 text-white border-green-700"
              : "bg-white text-gray-700 border-gray-300 hover:border-green-500"
          }`}
        >
          💵 Cash
        </button>
        <button
          type="button"
          onClick={() => onChange("upi")}
          className={`p-3 rounded-lg border-2 font-medium transition-all ${
            selected === "upi"
              ? "bg-blue-600 text-white border-blue-700"
              : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
          }`}
        >
          📱 UPI/Card
        </button>
      </div>
    </div>
  );
}
