import type { Metadata } from "next";
import { Inter, Sora, Geist_Mono } from "next/font/google";
import { WebVitals } from "@/components/ui/WebVitals/WebVitals";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AMIL",
  description: "Maria Belén Corvalán Amil, Senior Software Engineer based in Buenos Aires, Argentina.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
