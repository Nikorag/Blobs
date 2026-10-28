"use client";

import QR from "qrcode";
import { useEffect, useState } from "react";

/** A scannable QR for `value`: dark modules on a white tile so it reads on any background. */
export function QRCode({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QR.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#07140f", light: "#ffffff" } })
      .then((svg) => !cancelled && setSrc(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`))
      .catch(() => !cancelled && setSrc(null));
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className={`aspect-square rounded-2xl bg-white p-1.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- generated data URI, nothing to optimise */}
      {src && <img src={src} alt={label} className="size-full" />}
    </div>
  );
}
