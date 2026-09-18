import Link from "next/link";

type ErrorStatusViewProps = {
  code: 403 | 404 | 500;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  onPrimaryClick?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function ErrorStatusView({
  code,
  title,
  description,
  primaryHref = "/dashboard",
  primaryLabel = "Về tổng quan",
  onPrimaryClick,
  secondaryHref,
  secondaryLabel,
}: ErrorStatusViewProps) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-surface p-8 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-2xl font-bold text-primary-dark">
            {code}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Mã lỗi {code}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-on-surface-variant">{description}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {onPrimaryClick ? (
              <button type="button" className="btn btn-primary" onClick={onPrimaryClick}>
                {primaryLabel}
              </button>
            ) : (
              <Link href={primaryHref} className="btn btn-primary">
                {primaryLabel}
              </Link>
            )}
            {secondaryHref && secondaryLabel ? (
              <Link href={secondaryHref} className="btn btn-ghost">
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
