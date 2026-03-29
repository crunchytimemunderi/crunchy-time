"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = "md",
  text = "Loading...",
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-8 w-8 border-2",
    md: "h-12 w-12 border-b-2",
    lg: "h-16 w-16 border-b-3",
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizeClasses[size]} flex items-center justify-center text-4xl animate-spin`}
        style={{ animationDuration: '1s' }}
      >
        🍗
      </div>
      {text && (
        <p className="text-slate-300 dark:text-slate-400 text-sm font-medium">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        {spinner}
      </div>
    );
  }

  return spinner;
}
