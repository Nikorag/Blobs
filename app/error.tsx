"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[blobs] render error:", error);
  }, [error]);
  return <ErrorScreen retry={retry} />;
}
