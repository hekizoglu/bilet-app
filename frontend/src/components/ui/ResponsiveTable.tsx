"use client";

import React from "react";
import { Card } from "./Card";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
}

export interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  emptyTitle = "Kayıt Bulunamadı",
  emptyDescription = "Gösterilecek herhangi bir veri mevcut değil.",
  className = "",
}: ResponsiveTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
        <p className="font-semibold text-slate-700 dark:text-slate-200">{emptyTitle}</p>
        <p className="text-sm mt-1">{emptyDescription}</p>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* 1. Masaüstü Tablo Görünümü (md ve üzeri) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-3.5">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
            {data.map((item, idx) => (
              <tr
                key={keyExtractor(item, idx)}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                    {col.render
                      ? col.render(item, idx)
                      : String((item as Record<string, unknown>)[col.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2. Mobil Kart Görünümü (md altı ekranlar) */}
      <div className="md:hidden space-y-3">
        {data.map((item, idx) => (
          <Card
            key={keyExtractor(item, idx)}
            variant="surface"
            className="p-4 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60"
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col, colIdx) => {
                const label = col.mobileLabel || col.header;
                const value = col.render
                  ? col.render(item, idx)
                  : String((item as Record<string, unknown>)[col.key] ?? "-");

                return (
                  <div
                    key={col.key}
                    className={`flex items-center justify-between gap-4 text-xs ${
                      colIdx > 0 ? "pt-2" : ""
                    }`}
                  >
                    <span className="font-medium text-slate-500 dark:text-slate-400 shrink-0">
                      {label}
                    </span>
                    <div className="text-right font-medium text-slate-800 dark:text-slate-100">
                      {value}
                    </div>
                  </div>
                );
              })}
          </Card>
        ))}
      </div>
    </div>
  );
}
