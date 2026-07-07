"use client";

import RouteErrorFallback from "@/components/RouteErrorFallback";

export default function PaymentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      title="Odeme alani yuklenemedi"
      description="Odeme akisi acilirken bir hata olustu. Tekrar deneyin."
    />
  );
}
