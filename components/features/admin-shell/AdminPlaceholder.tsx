import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

type Props = {
  title: string;
  description: string;
  phase: string;
  icon?: LucideIcon;
};

export function AdminPlaceholder({ title, description, phase, icon: Icon = Construction }: Props) {
  return (
    <div className="space-y-6 text-zinc-100">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <Icon className="h-6 w-6 text-amber-400" />
          {title}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-6">
        <div className="flex items-start gap-3">
          <Construction className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">Em construção</p>
            <p className="mt-1 text-xs text-amber-200/80">
              Esta seção está planejada para a {phase}. Veja o roadmap em{" "}
              <code className="rounded bg-zinc-900 px-1 py-0.5 text-amber-300">
                NEXT_SESSION.md
              </code>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
