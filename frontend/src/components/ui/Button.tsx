"use client";

import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    // Genişliği değişmemesi için grid / inline-flex dengesi ve sabit min-h/min-w
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus:ring-blue-500 border border-transparent",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-700",
      danger:
        "bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-red-500 border border-transparent",
      outline:
        "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600",
      ghost:
        "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300",
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: "text-xs px-3 py-1.5 min-w-[70px] gap-1.5",
      md: "text-sm px-4 py-2 min-w-[90px] gap-2",
      lg: "text-base px-6 py-3 min-w-[120px] gap-2.5",
    };

    const combinedClassName = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        className={combinedClassName}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
