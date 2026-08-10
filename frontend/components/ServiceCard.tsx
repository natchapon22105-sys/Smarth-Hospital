import Link from "next/link";

export default function ServiceCard({
  href,
  label,
  icon,
  disabled,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={`card flex flex-col items-center justify-center gap-3 px-6 py-8 text-center transition ${
        disabled ? "opacity-40" : "hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
      }`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-light text-teal-dark">
        {icon}
      </div>
      <span className="font-display text-[15px] font-medium text-ink">{label}</span>
      {disabled && <span className="text-xs text-ink/40">เร็วๆ นี้</span>}
    </div>
  );

  if (disabled) return <div aria-disabled>{content}</div>;
  return <Link href={href}>{content}</Link>;
}
