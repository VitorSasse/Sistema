import "./globals.css";
import type { Metadata } from "next";
import { Montserrat, Orbitron } from "next/font/google";
import { ReactNode } from "react";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"]
});

export const metadata: Metadata = {
  title: "BASEPRO",
  description: "Sua operacao pesada, agora sob controle.",
  icons: {
    icon: "/assets/basepro-icon.svg",
    shortcut: "/assets/basepro-icon.svg",
    apple: "/assets/basepro-icon.svg"
  }
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body className={`${montserrat.variable} ${orbitron.variable}`}>{children}</body>
    </html>
  );
}
