"use client";

import RouteErrorFallback from "@/components/RouteErrorFallback";

export default function EventError({
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
      title="Etkinlik sayfasi yuklenemedi"
      description="Etkinlik detaylari veya koltuk verileri alinirken bir hata olustu."
    />
  );
}
