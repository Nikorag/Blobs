import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import { CosmeticsProvider } from "@/components/CosmeticsProvider";
import { GamepadNavigator } from "@/components/GamepadNavigator";
import { ZontoProvider } from "@/components/ZontoProvider";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Blobs",
  description: "The trick-calling card game. Say how many tricks you'll win, then win exactly that many.",
  applicationName: "Blobs",
  appleWebApp: { capable: true, title: "Blobs", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0e2a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fredoka.variable} h-full antialiased`}>
      <body className="min-h-dvh">
        <ZontoProvider>
          <CosmeticsProvider>{children}</CosmeticsProvider>
          <GamepadNavigator />
        </ZontoProvider>
      </body>
    </html>
  );
}
