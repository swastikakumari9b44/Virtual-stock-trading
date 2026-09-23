import { useEffect, useRef, type ReactNode } from "react";

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-tape/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-3 text-sm text-muted">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} className="btn-quiet" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn bg-loss text-white hover:bg-loss/90" onClick={onConfirm} disabled={busy}>
            {busy ? "Selling…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
