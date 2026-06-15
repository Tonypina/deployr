import type { Metadata } from "next";
import { JetBrains_Mono, Saira_Condensed } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});
const sairaCondensed = Saira_Condensed({
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Deployr",
  description: "Dispatch. Done Better. — Service management platform.",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} ${sairaCondensed.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
