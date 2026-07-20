import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "f1ghtback | One Safe Next Step",
  description: "A source-grounded legal-information guide that turns court overwhelm into one contained action.",
  applicationName: "f1ghtback",
  robots: { index: true, follow: true },
  openGraph: {
    title: "f1ghtback: One Safe Next Step",
    description: "Choose three non-personal details. Leave with one source-backed next action.",
    type: "website",
    images: [{ url: "/og.png", width: 1745, height: 909, alt: "f1ghtback: One Safe Next Step" }],
  },
  twitter: { card: "summary_large_image", title: "f1ghtback: One Safe Next Step", description: "Court overwhelm, reduced to one contained action.", images: ["/og.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#201d1e", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
