"use client";

import RouteErrorFallback from "@/components/RouteErrorFallback";

export default function ProfileError({
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
      title="Profil alani yuklenemedi"
      description="Profil veya bilet bilgileriniz acilirken bir hata olustu."
    />
  );
}
