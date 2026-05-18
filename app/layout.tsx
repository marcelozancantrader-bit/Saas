import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://memorial-ai-mu.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Memorial.ai — Copiloto Documental para Arquitetos e Engenheiros",
    template: "%s · Memorial.ai",
  },
  description:
    "Da planta ao contrato em horas, não semanas. SaaS brasileiro com IA pra extração de planta, orçamento SINAPI, 10 tipos de documento técnico e portal do cliente com aprovação digital.",
  applicationName: "Memorial.ai",
  authors: [{ name: "Memorial.ai" }],
  keywords: [
    "arquitetura",
    "engenharia civil",
    "memorial descritivo",
    "orçamento SINAPI",
    "projeto residencial",
    "BIM",
    "SaaS construção civil",
    "ART CREA",
    "RRT CAU",
    "portal do cliente",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Memorial.ai",
    title: "Memorial.ai — Da planta ao contrato em horas",
    description:
      "Copiloto IA para arquitetos e engenheiros: extração de planta, orçamento SINAPI, 10 documentos técnicos e portal do cliente com aprovação digital.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Memorial.ai — Da planta ao contrato em horas",
    description:
      "SaaS brasileiro com IA pra arquitetos e engenheiros civis. Memorial, caderno, proposta, contrato, orçamento SINAPI e portal do cliente.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
