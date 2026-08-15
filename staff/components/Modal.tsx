"use client";

import { ReactNode } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl2 border border-line bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-ink/40 transition hover:bg-line/50 hover:text-ink"
              aria-label="ปิด"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
