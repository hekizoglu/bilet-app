"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

type RouteErrorFallbackProps = {
  error: Error & { digest?: string };
  title?: string;
  description?: string;
  reset?: () => void;
};

export default function RouteErrorFallback({
  error,
  title = "Bu bolum yuklenemedi",
  description = "Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.",
  reset,
}: RouteErrorFallbackProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 text-2xl">
          !
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => reset?.()}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Tekrar dene
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Sayfayi yenile
          </button>
        </div>
      </div>
    </div>
  );
}
