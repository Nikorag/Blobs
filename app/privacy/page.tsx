import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Blobs · privacy" };

const ZONTO_BASE = process.env.NEXT_PUBLIC_ZONTO_BASE_URL ?? "https://www.nikorag.co.uk";

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: "What Blobs keeps on your device",
    body: (
      <p>
        A random device id and your chosen name, in your browser&apos;s local storage, so a refresh puts you back in your seat. A game against the computer is also
        saved there so you can resume it, along with your chosen cosmetics. None of this leaves your device in a CPU game. You can clear it any time from your
        browser&apos;s site data.
      </p>
    ),
  },
  {
    title: "What is sent when you play online",
    body: (
      <p>
        Your name, your look (blob colours), your calls, the cards you play and chat-style reactions (emotes) are sent to our server so the other players can see them.
        Your device id is sent to the server as a secret that proves a seat is yours; other players only ever see a one-way hash of it, never the id itself. Your IP
        address is used briefly to limit abuse, and appears in hosting logs.
      </p>
    ),
  },
  {
    title: "Where it is stored and for how long",
    body: (
      <p>
        Online game state is held in a Redis database, reached through a service called Webdis, and is deleted automatically 24 hours after the table was last
        used. The site itself is hosted on Vercel. We don&apos;t use analytics or advertising in Blobs.
      </p>
    ),
  },
  {
    title: "If you sign in with Zonto",
    body: (
      <p>
        Signing in is optional. If you do, Zonto stores your gamertag, achievements, play time, friends, online presence, lobby invites and cloud saves, and your
        coin balance and cosmetics, under your Zonto account. That is covered by the{" "}
        <a className="text-accent underline underline-offset-4" href={`${ZONTO_BASE}/p/privacy`}>
          Zonto privacy policy
        </a>
        , which also explains how to access, correct or delete your data.
      </p>
    ),
  },
  {
    title: "Contact",
    body: (
      <p>
        Questions or requests about your data: <a className="text-accent underline underline-offset-4" href="mailto:info@nikorag.co.uk">info@nikorag.co.uk</a>.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <main className="safe-top safe-bottom mx-auto min-h-dvh max-w-md px-5 py-8">
      <div className="mb-6 flex justify-center">
        <Logo compact />
      </div>
      <h1 className="mb-4 text-2xl font-extrabold">Privacy</h1>
      <div className="space-y-5 text-[0.95rem] leading-snug text-ink/90">
        {sections.map((s) => (
          <section key={s.title} className="space-y-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{s.title}</h2>
            {s.body}
          </section>
        ))}
      </div>
      <Link href="/" className="btn btn-ghost mt-8 w-full">
        Back to home
      </Link>
    </main>
  );
}
