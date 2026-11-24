"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";
import "./globals.css";

/** Replaces the root layout when it is the thing that failed, so it brings its own <html> and <body>. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[blobs] fatal render error:", error);
  }, [error]);
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <ErrorScreen retry={retry} />
      </body>
    </html>
  );
}
