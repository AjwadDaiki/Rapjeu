import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora, Space_Grotesk, Unbounded, Archivo_Black } from "next/font/google";
import "./globals.css";
import "./styles/gta-sa.css";
import "./styles/rapjeu-modern.css";
import { GameProvider } from "./hooks/useGameContext";
import { SocketProvider } from "./hooks/useSocket";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "RAPJEU - Quiz Rap Battle Multijoueur",
  description: "Le jeu de quiz rap multijoueur en temps reel. Affrontez vos amis dans des modes de jeu explosifs !",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${spaceGrotesk.variable} ${unbounded.variable} ${archivoBlack.variable} antialiased`}
      >
        <SocketProvider>
          <GameProvider>
            {children}
          </GameProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
