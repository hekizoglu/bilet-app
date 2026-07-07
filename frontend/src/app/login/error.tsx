"use client";

import RouteErrorFallback from "@/components/RouteErrorFallback";

export default function LoginError({
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
      title="Giris alani yuklenemedi"
      description="Kimlik dogrulama akisi acilirken bir hata olustu."
    />
  );
}
