"use client";

import React from "react";

export type StatusBadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "vip";

export interface StatusBadgeProps {
  variant?: StatusBadgeVariant;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = "neutral",
  label,
  icon,
  className = "",
  size = "md",
}) => {
  const variantStyles: Record<StatusBadgeVariant, string> = {
    success:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
    warning:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    danger:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    info:
      "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    neutral:
      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    vip:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  };

  const sizeStyles = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5 font-medium",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border select-none transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{label}</span>
    </span>
  );
};
