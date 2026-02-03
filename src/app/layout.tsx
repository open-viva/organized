import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Organized - Piano di Studio AI",
  description: "Organizza automaticamente la tua settimana scolastica con ClasseViva e AI",
  keywords: ["classeviva", "scuola", "studio", "organizzazione", "ai", "notion", "ical"],
  authors: [{ name: "Organized" }],
  openGraph: {
    title: "Organized - Piano di Studio AI",
    description: "Organizza automaticamente la tua settimana scolastica con ClasseViva e AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
