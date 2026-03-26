"use client";

interface SummaryCardProps {
  title: string;
  items: { label: string; value: string | number; formatAsINR?: boolean }[];
  gradientFrom?: string;
  gradientTo?: string;
}

/**
 * Shared summary card for Today's Total sections.
 * Used for sales totals and expense totals.
 */
export default function SummaryCard({
  title,
  items,
  gradientFrom = "from-green-600",
  gradientTo = "to-green-700",
}: SummaryCardProps) {
  return (
    <div
      className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-lg p-4 mb-4 text-white`}
    >
      <h2 className="text-base font-bold mb-3">{title}</h2>
      <div
        className={`grid grid-cols-${items.length} gap-3 text-center`}
      >
        {items.map((item, index) => (
          <div key={index}>
            <div className="text-xs opacity-90">{item.label}</div>
            <div className="text-xl font-bold">
              {item.formatAsINR !== false
                ? `₹${Number(item.value).toLocaleString("en-IN")}`
                : item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
