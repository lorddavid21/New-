import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Haven Estate | Find a place for what comes next",
    template: "%s | Haven Estate",
  },
  description: "Thoughtful homes, land, rooms and commercial properties across Nigeria.",
  openGraph: {
    title: "Haven Estate",
    description: "Thoughtful homes and places, found with confidence.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
