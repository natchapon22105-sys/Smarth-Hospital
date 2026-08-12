import Link from "next/link";

export default function ServiceCard({
  href,
  label,
  icon,
  disabled,
  alert,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  alert?: boolean;
  badge?: number | null;
}) {
  const content = (
    <div
      className={`card relative flex flex-col items-center justify-center gap-3 px-6 py-8 text-center transition ${
        alert ? "border-2 border-danger ring-2 ring-danger/20 bg-danger/5" : ""
      } ${disabled ? "opacity-40" : "hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"}`}
    >
      {/* Alert badge (exclamation) */}
      {alert && (
        <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white shadow-md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
      )}

      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${alert ? "bg-danger/10 text-danger" : "bg-teal-light text-teal-dark"}`}>
        {icon}
      </div>
      <span className="font-display text-[15px] font-medium text-ink">{label}</span>
      {alert && badge ? (
        <span className="rounded-full bg-danger px-2.5 py-0.5 text-xs font-medium text-white">
          ใหม่ {badge} รายการ
        </span>
      ) : disabled ? (
        <span className="text-xs text-ink/40">เร็วๆ นี้</span>
      ) : null}
    </div>
  );

  if (disabled) return <div aria-disabled>{content}</div>;
  return <Link href={href}>{content}</Link>;
}
