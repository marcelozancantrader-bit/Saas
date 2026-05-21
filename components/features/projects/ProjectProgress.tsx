import Link from "next/link";
import { CheckIcon, CircleIcon } from "lucide-react";

type StepKey =
  | "cadastro"
  | "planta"
  | "validacao"
  | "briefing"
  | "documentos"
  | "aprovacao"
  | "art-rrt";

type Step = {
  key: StepKey;
  label: string;
  hint: string;
  status: "done" | "current" | "todo" | "optional";
  href: string;
};

type Props = {
  projectId: string;
  hasFiles: boolean;
  extractionConfirmed: boolean;
  briefingStatus: "none" | "aguardando" | "preenchido";
  documentsCount: number;
  approvedDocuments: number;
  hasArtRrtData: boolean;
  /** Cadastro incompleto (cliente não vinculado, endereço faltando, etc) */
  hasClient?: boolean;
  hasAddress?: boolean;
};

export function ProjectProgress({
  projectId,
  hasFiles,
  extractionConfirmed,
  briefingStatus,
  documentsCount,
  approvedDocuments,
  hasArtRrtData,
  hasClient,
  hasAddress,
}: Props) {
  const tab = (t: string) => `/projetos/${projectId}?tab=${t}`;
  const docsPage = `/projetos/${projectId}/documentos`;
  const cadastroComplete = !!hasClient && !!hasAddress;
  const steps: Step[] = [
    {
      key: "cadastro",
      label: "Cadastro",
      hint: cadastroComplete
        ? "Cliente e endereço definidos"
        : !hasClient
          ? "Vincule um cliente ao projeto"
          : "Adicione o endereço da obra",
      status: cadastroComplete ? "done" : "current",
      href: tab("visao"),
    },
    {
      key: "planta",
      label: "Planta",
      hint: hasFiles
        ? extractionConfirmed
          ? "Extração confirmada"
          : "Aguardando confirmação da extração"
        : "Faça upload da planta em PDF",
      status: extractionConfirmed ? "done" : hasFiles ? "current" : "todo",
      href: tab("planta"),
    },
    {
      key: "validacao",
      label: "Validação",
      hint: extractionConfirmed
        ? "NBR + zoneamento avaliados"
        : "Disponível após confirmar a extração",
      status: extractionConfirmed ? "done" : "todo",
      href: tab("validacao"),
    },
    {
      key: "briefing",
      label: "Briefing",
      hint:
        briefingStatus === "preenchido"
          ? "Cliente preencheu"
          : briefingStatus === "aguardando"
            ? "Aguardando cliente"
            : "Solicite ao cliente pelo portal",
      status:
        briefingStatus === "preenchido"
          ? "done"
          : briefingStatus === "aguardando"
            ? "current"
            : "optional",
      href: tab("briefing"),
    },
    {
      key: "documentos",
      label: "Documentos",
      hint:
        documentsCount > 0 ? `${documentsCount} doc(s) gerado(s)` : "Gere memorial, proposta etc",
      status: documentsCount > 0 ? "done" : extractionConfirmed ? "current" : "todo",
      href: docsPage,
    },
    {
      key: "aprovacao",
      label: "Aprovação",
      hint:
        approvedDocuments > 0
          ? `${approvedDocuments} doc(s) aprovado(s)`
          : "Envie ao cliente pelo portal",
      status: approvedDocuments > 0 ? "done" : documentsCount > 0 ? "current" : "todo",
      href: docsPage,
    },
    {
      key: "art-rrt",
      label: "ART/RRT",
      hint: hasArtRrtData ? "Pronta para baixar" : "Pré-preenchimento opcional",
      status: hasArtRrtData ? "done" : "optional",
      href: tab("art-rrt"),
    },
  ];

  return (
    <nav aria-label="Progresso do projeto">
      <ol className="flex w-full gap-2 overflow-x-auto pb-2 md:gap-3">
        {steps.map((s, i) => (
          <li key={s.key} className="flex min-w-[110px] flex-1 flex-col">
            <Link
              href={s.href}
              scroll
              className="group flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-400 hover:bg-zinc-50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
              aria-label={`Etapa ${i + 1}: ${s.label} — ${s.hint}`}
            >
              <div className="flex items-center gap-2">
                <StatusDot status={s.status} />
                <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                  {i + 1}
                </span>
              </div>
              <p
                className={
                  s.status === "done"
                    ? "text-sm font-medium text-zinc-900 dark:text-zinc-50"
                    : s.status === "current"
                      ? "text-sm font-medium text-zinc-900 dark:text-zinc-50"
                      : "text-sm font-medium text-zinc-500"
                }
              >
                {s.label}
              </p>
              <p className="text-[11px] leading-snug text-zinc-500">{s.hint}</p>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function StatusDot({ status }: { status: Step["status"] }) {
  if (status === "done") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
        <CheckIcon className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="inline-flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-amber-500 text-white">
        <CircleIcon className="size-2.5 fill-current" strokeWidth={0} />
      </span>
    );
  }
  if (status === "optional") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-zinc-400 text-zinc-400">
        <CircleIcon className="size-2.5" strokeWidth={0} fill="currentColor" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 text-zinc-300 dark:border-zinc-700 dark:text-zinc-700">
      <CircleIcon className="size-2.5" strokeWidth={0} fill="currentColor" />
    </span>
  );
}
