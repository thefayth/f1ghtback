import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://f1ghtback-one-safe-next-step.indigo-iris-5804.chatgpt.site"),
  title: "f1ghtback | Guided Filing and Packet Studio",
  description: "A private-in-the-browser guided filing preparation tool for California and Utah family court responses.",
  applicationName: "f1ghtback",
  robots: { index: true, follow: true },
  openGraph: {
    title: "f1ghtback: Guided Filing and Packet Studio",
    description: "Understand court papers, prepare exact-word answers, and download a draft review packet without an account or upload.",
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "f1ghtback: One Safe Next Step" }],
  },
  twitter: { card: "summary_large_image", title: "f1ghtback: Guided Filing and Packet Studio", description: "Source-backed court response preparation with device-only answers.", images: ["/og.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#201d1e", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
