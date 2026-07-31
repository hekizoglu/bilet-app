"use client";

import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      id,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

    const baseInputStyles =
      "w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const borderStyle = error
      ? "border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/40"
      : "border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900/40";

    const paddingLeft = leftIcon ? "pl-10" : "pl-3";
    const paddingRight = rightIcon ? "pr-10" : "pr-3";

    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-200 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={[baseInputStyles, borderStyle, paddingLeft, paddingRight, className]
              .filter(Boolean)
              .join(" ")}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
