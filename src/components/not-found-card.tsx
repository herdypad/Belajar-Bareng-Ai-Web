import { ButtonLink, EmptyState } from "./ui";

export function NotFoundCard({ what }: { what: string }) {
  return (
    <EmptyState
      icon="alert"
      title={`${what} tidak ditemukan`}
      description="Data mungkin sudah dihapus atau berasal dari perangkat/browser lain."
      action={
        <ButtonLink href="/history" icon="history">
          Ke Riwayat
        </ButtonLink>
      }
    />
  );
}
