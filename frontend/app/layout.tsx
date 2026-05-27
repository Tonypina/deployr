import type { Metadata } from "next";
import { Inter, Saira_Condensed } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const saira = Saira_Condensed({
  weight: ["700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "deployr",
  description: "Dispatch. Done Better. — Service management platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${saira.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
