"use client";

import RouteErrorFallback from "@/components/RouteErrorFallback";

export default function TelegramError({
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
      title="Telegram akisi yuklenemedi"
      description="Telegram ile ilgili veriler alinirken bir hata olustu."
    />
  );
}
