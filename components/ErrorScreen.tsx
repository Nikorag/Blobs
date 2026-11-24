"use client";

import { Logo } from "./Logo";

/** Full-page "something went wrong" in the Blobs style. Plain links, so it works even if routing is what broke. */
export function ErrorScreen({ retry, title = "That didn't go to plan", body = "Something broke on our side. Try again, or head back to the start." }: { retry?: () => void; title?: string; body?: string }) {
  return (
    <main className="safe-top safe-bottom mx-auto grid min-h-dvh max-w-md place-items-center px-5 text-center">
      <div className="space-y-4">
        <Logo compact />
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="text-muted">{body}</p>
        <div className="flex flex-col gap-3 pt-2">
          {retry && (
            <button className="btn btn-primary" onClick={() => retry()}>
              Try again
            </button>
          )}
          {/* A real link (full page load) so a broken client state can't stop it working. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="btn btn-ghost">
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
