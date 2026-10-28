"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

/** Bottom sheet on mobile, centred card on wide screens. */
export function Sheet({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={title}>
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="anim-fade absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
      />
      <div className="anim-sheet safe-bottom relative flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-[1.75rem] border border-line bg-[#151a45] px-5 pt-3 shadow-2xl sm:rounded-[1.75rem]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">{title}</h2>
            {onClose && (
              <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-surface2 text-lg">
                ×
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto pb-2">{children}</div>
      </div>
    </div>
  );
}
