import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://f1ghtback-one-safe-next-step.indigo-iris-5804.chatgpt.site"),
  title: "f1ghtback | One Safe Next Step",
  description: "A bounded AI record-review and device-only court preparation tool with visible receipts and human holds.",
  applicationName: "f1ghtback",
  robots: { index: true, follow: true },
  openGraph: {
    title: "f1ghtback: One Safe Next Step",
    description: "Turn a synthetic record into a safe action queue, then prepare exact-word court response drafts in your browser.",
    type: "website",
    images: [{ url: "/og-v2.png", width: 1731, height: 909, alt: "f1ghtback: One Safe Next Step" }],
  },
  twitter: { card: "summary_large_image", title: "f1ghtback: One Safe Next Step", description: "Bounded AI record review, source-backed routing, and device-only court preparation.", images: ["/og-v2.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#201d1e", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
