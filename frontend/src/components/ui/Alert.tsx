"use client";

import React from "react";

export type AlertVariant = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  children,
  icon,
  onClose,
  className = "",
}) => {
  const variantStyles: Record<AlertVariant, string> = {
    info:
      "bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-900/20 dark:text-sky-200 dark:border-sky-800",
    success:
      "bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800",
    warning:
      "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800",
    danger:
      "bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800",
  };

  return (
    <div
      role="alert"
      className={[
        "rounded-xl border p-4 transition-all flex items-start gap-3",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
      <div className="flex-1 text-sm">
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Kapat"
        >
          ✕
        </button>
      )}
    </div>
  );
};
