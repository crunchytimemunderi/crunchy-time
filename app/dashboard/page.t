"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Dummy user role for demo; replace with real auth logic
const userData = { role: "admin" }; // or "staff"

function DashboardContent() {
  const isAdmin = userData.role === "admin";
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-white">Dashboard</h1>
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Sales</h2>
          {/* Sales stats and list here */}
          <div className="bg-white/10 rounded p-4 mb-4 text-white">Sales section</div>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Expenses</h2>
          {/* Expenses stats and list here */}
          <div className="bg-white/10 rounded p-4 mb-4 text-white">Expenses section</div>
        </div>
        {isAdmin && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">Profit (Admin Only)</h2>
            {/* Profit stats here */}
            <div className="bg-emerald-700/10 rounded p-4 mb-4 text-emerald-300">Profit section</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
                            event: "*",
                            schema: "public",
                            table: "sales",
                            filter: `date=eq.${today}`,
                          }, async () => {
                            let query = supabase.from("sales").select("*").eq("date", today).order("created_at", { ascending: false });
                            if (!isAdmin) query = query.eq("created_by", user.id);
                            const { data } = await query;
                            setSales((data || []).map((s) => ({
                              id: s.id,
                              amount: s.amount,
                              paymentMethod: s.payment_method,
                              description: s.description,
                              createdAt: s.created_at,
                              createdBy: s.created_by,
                              createdByName: s.created_by_name,
                            })));
                          });
                          salesChannel.subscribe();
                          const expensesChannel = supabase.channel("expenses-changes");
                          expensesChannel.on("postgres_changes", {
                            event: "*",
                            schema: "public",
                            table: "expenses",
                            filter: `date=eq.${today}`,
                          }, async () => {
                            let query = supabase.from("expenses").select("*").eq("date", today).order("created_at", { ascending: false });
                            if (!isAdmin) query = query.eq("created_by", user.id);
                            const { data } = await query;
                            setExpenses((data || []).map((e) => ({
                              id: e.id,
                              amount: e.amount,
                              category: e.category,
                              description: e.description,
                              createdAt: e.created_at,
                              createdBy: e.created_by,
                              createdByName: e.created_by_name,
                            })));
                          });
                          expensesChannel.subscribe();
                          return () => {
                            salesChannel.unsubscribe();
                            expensesChannel.unsubscribe();
                          };

                        "use client";
                        import { useState, useEffect, useMemo } from "react";
                        import { useSearchParams } from "next/navigation";
                        import Link from "next/link";

                        function DashboardContent() {
                          return (
                            <div className="min-h-screen p-4 md:p-8 bg-gray-900">
                              <div className="max-w-7xl mx-auto">
                                {/* Dashboard content goes here */}
                              </div>
                            </div>
                          );
                        }

                        export default function DashboardPage() {
                          return <DashboardContent />;
                        }
                          {/* Stats Grid */}
                          {/* ...existing code... */}
                          {/* Profit & Cash Difference - Admin Only */}
                          {/* ...existing code... */}
                          {/* Recent Activity */}
                          {/* ...existing code... */}
                        </div>
                      </div>
                    );
                          {expense.description}
                        </p>
                        {isAdmin && (
                          <p className="text-xs text-gray-500 mt-1">
                            By: {expense.createdByName}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 capitalize">
                          {expense.category}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(
                            expense.createdAt?.toDate
                              ? expense.createdAt.toDate()
                              : new Date(),
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
	return <DashboardContent />;
}
"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function DashboardContent() {
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard content goes here */}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
        {/* Dashboard content goes here */}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
