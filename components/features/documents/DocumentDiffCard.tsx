import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { DocDiff } from "@/lib/tiptap/diff-stats";

type Props = {
  diff: DocDiff;
  previousVersao: number;
};

/**
 * Card compacto mostrando o que mudou entre a versão anterior e a atual
 * deste documento. Aparece só quando há versão anterior (currentVersao > 1).
 *
 * Justifica o gasto de IA (regerar) e dá controle pra Camila confirmar que
 * a nova versão não regrediu (perdeu sections, encolheu drasticamente).
 */
export function DocumentDiffCard({ diff, previousVersao }: Props) {
  const grew = diff.charsDelta > 0;
  const shrunk = diff.charsDelta < 0;
  const same = diff.charsDelta === 0;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm dark:border-blue-900/40 dark:bg-blue-950/20">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-blue-700 uppercase dark:text-blue-400">
          Mudanças em relação à v{previousVersao}
        </p>
        <span className="text-[10px] text-zinc-500">comparando com a versão anterior</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1">
          {grew ? (
            <ArrowUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          ) : shrunk ? (
            <ArrowDown className="h-3 w-3 text-rose-600 dark:text-rose-400" />
          ) : (
            <Minus className="h-3 w-3 text-zinc-500" />
          )}
          <strong
            className={
              grew
                ? "text-emerald-700 dark:text-emerald-400"
                : shrunk
                  ? "text-rose-700 dark:text-rose-400"
                  : "text-zinc-700 dark:text-zinc-300"
            }
          >
            {diff.charsDelta > 0 ? `+${diff.charsDelta}` : diff.charsDelta}
          </strong>
          <span className="text-zinc-500">caracteres</span>
        </span>

        <span className="inline-flex items-center gap-1">
          <strong className="text-zinc-700 dark:text-zinc-300">
            {diff.wordsDelta > 0 ? `+${diff.wordsDelta}` : diff.wordsDelta}
          </strong>
          <span className="text-zinc-500">palavras</span>
        </span>

        <span className="inline-flex items-center gap-1">
          <span className="text-zinc-500">Total</span>
          <strong className="text-zinc-700 dark:text-zinc-300">{diff.sectionsTotal}</strong>
          <span className="text-zinc-500">{diff.sectionsTotal === 1 ? "seção" : "seções"}</span>
        </span>
      </div>

      {diff.sectionsAdded.length > 0 ? (
        <div className="mt-2">
          <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            Novas seções ({diff.sectionsAdded.length}):
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {diff.sectionsAdded.map((s) => (
              <li key={s} className="text-xs text-zinc-700 dark:text-zinc-300">
                + {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {diff.sectionsRemoved.length > 0 ? (
        <div className="mt-2">
          <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400">
            Seções removidas ({diff.sectionsRemoved.length}):
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {diff.sectionsRemoved.map((s) => (
              <li key={s} className="text-xs text-zinc-700 dark:text-zinc-300">
                − {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {same && diff.sectionsAdded.length === 0 && diff.sectionsRemoved.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500 italic">
          Conteúdo praticamente idêntico — só o título ou metadados podem ter mudado.
        </p>
      ) : null}

      <p className="mt-2 text-[11px] text-zinc-500">
        Não gostou da nova versão? A versão v{previousVersao} continua salva — use o menu Documentos
        pra abrir.
      </p>
    </div>
  );
}
