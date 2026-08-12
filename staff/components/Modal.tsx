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
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl2 border border-white/10 bg-navy-dark p-6 shadow-navy-card"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-white/60 transition hover:bg-white/10 hover:text-white"
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
