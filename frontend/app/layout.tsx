import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Saira_Condensed } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});
const sairaCondensed = Saira_Condensed({
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "deployr",
  description: "Dispatch. Done Better. — Service management platform.",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${sairaCondensed.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
