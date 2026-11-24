import Link from "next/link";
import { JoinByCode } from "@/components/JoinByCode";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Blobs · not found" };

export default function NotFound() {
  return (
    <main className="safe-top safe-bottom mx-auto grid min-h-dvh max-w-md place-items-center px-5 text-center">
      <div className="space-y-4">
        <Logo compact />
        <h1 className="text-2xl font-extrabold">Nothing here</h1>
        <p className="text-muted">That page doesn&apos;t exist. Got a table code? Jump straight in.</p>
        <JoinByCode />
        <Link href="/" className="btn btn-primary w-full">
          Back to home
        </Link>
      </div>
    </main>
  );
}
