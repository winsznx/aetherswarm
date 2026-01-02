import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Web3Provider } from "@/context/Web3Provider";

export const metadata: Metadata = {
  title: "AetherSwarm — Decentralized Knowledge Expedition",
  description: "An autonomous AI agent swarm that hunts, verifies, and synthesizes knowledge using machine-to-machine micropayments. Deploy research quests and let AI agents discover verified insights.",
  keywords: ["AI agents", "autonomous", "research", "x402", "ERC-8004", "knowledge", "verification", "TEE"],
  icons: {
    icon: [
      { url: '/AS Fav1.svg', type: 'image/svg+xml' },
      { url: '/AS Fav1.png', type: 'image/png' },
    ],
    shortcut: '/AS Fav1.svg',
    apple: '/AS Fav1.png',
  },
  openGraph: {
    title: "AetherSwarm",
    description: "Decentralized Knowledge Expedition Platform",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get('cookie');

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Web3Provider cookies={cookies}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
