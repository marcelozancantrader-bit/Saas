import { ShieldCheck, RefreshCw, Lock, Heart } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Sem fidelidade",
    body: "Cancele a qualquer momento, sem multa. Seu plano vira Free no mesmo segundo.",
  },
  {
    icon: RefreshCw,
    title: "14 dias pra testar",
    body: "Plano Free é gratuito. Pago não satisfeito nos primeiros 14 dias? Reembolso integral.",
  },
  {
    icon: Lock,
    title: "Conformidade LGPD",
    body: "Export e exclusão de dados em 1 clique. Audit log imutável de cada decisão sensível.",
  },
  {
    icon: Heart,
    title: "Suporte humano",
    body: "Founder responde no WhatsApp e e-mail. Não tem fila de tickets nem bot terceirizando.",
  },
];

export function GuaranteeBadge() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Icon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {item.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
