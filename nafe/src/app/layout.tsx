import type { Metadata, Viewport } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NAFE — Confianza en lo que nace cerca",
  description:
    "Radar de proximidad hiperlocal que conecta pequeños productores rurales, campesinos y artesanos con tu comunidad en México.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NAFE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#DEDED8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      className={`${newsreader.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-[#DEDED8] text-[#13150C] font-sans selection:bg-[#DBF7EC] selection:text-[#13150C]">
        {children}
      </body>
    </html>
  );
}
