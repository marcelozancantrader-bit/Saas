import { Star, FileText, Zap, Shield } from "lucide-react";

const BADGES = [
  { icon: Star, label: "Beta convidado", sub: "Early access exclusivo" },
  { icon: FileText, label: "10 docs IA", sub: "Memorial · Caderno · Proposta · Contrato +6" },
  { icon: Zap, label: "60s extração", sub: "Claude Sonnet 4.6 (Anthropic)" },
  { icon: Shield, label: "LGPD ✓", sub: "Art. 18 completo + audit log" },
];

export function SocialProof() {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
      {BADGES.map((b) => {
        const Icon = b.icon;
        return (
          <div
            key={b.label}
            className="flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80"
          >
            <Icon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="leading-tight">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{b.label}</p>
              <p className="text-[10px] text-zinc-500">{b.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
