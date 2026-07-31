"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "surface" | "glass" | "elevated";
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "surface", className = "", children, ...props }, ref) => {
    const variantStyles = {
      surface:
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm",
      glass:
        "glass-card",
      elevated:
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg",
    };

    return (
      <div
        ref={ref}
        className={[
          "rounded-xl transition-all duration-200 overflow-hidden",
          variantStyles[variant],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800/60 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <h3 className={`text-lg font-semibold text-slate-900 dark:text-slate-100 ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <p className={`text-sm text-slate-500 dark:text-slate-400 mt-1 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  children,
  ...props
}) => (
  <div
    className={`px-6 py-4 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
);
