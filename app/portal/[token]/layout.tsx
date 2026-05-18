import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal do projeto — Memorial.ai",
  description: "Acompanhe e aprove documentos do seu projeto.",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {children}
    </div>
  );
}
