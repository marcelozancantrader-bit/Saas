"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DISCIPLINA_LABEL, type Disciplina } from "@/lib/ai/prompts/_shared-extraction-schema";
import { confirmDisciplineExtractionAction } from "@/server/actions/extraction/confirm-discipline-extraction.action";
import { toast } from "sonner";

type ExtracaoDisciplinaEntry = {
  source_file_id: string;
  data: Record<string, unknown>;
  extracted_at: string;
  confirmed_by_user?: boolean;
  prompt_version?: string;
  usd_cost?: number;
};

type Props = {
  projectId: string;
  extracoes: Partial<Record<Disciplina, ExtracaoDisciplinaEntry>>;
};

/**
 * Resumo das extrações de disciplinas complementares (elétrica/hidráulica/estrutural/gás/HVAC).
 * Mostra os números mais relevantes da extração e botão Confirmar.
 *
 * Edição livre dos campos extraídos ainda não é suportada — pra corrigir dados,
 * o usuário re-sobe um PDF com versão melhor.
 */
export function DisciplineExtractionsCard({ projectId, extracoes }: Props) {
  const entries = (Object.entries(extracoes) as [Disciplina, ExtracaoDisciplinaEntry][]).filter(
    (e): e is [Exclude<Disciplina, "architectural">, ExtracaoDisciplinaEntry] =>
      e[0] !== "architectural",
  );

  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Disciplinas complementares</CardTitle>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Extrações de projetos elétrico, hidrossanitário, estrutural, gás e climatização. Cada uma
          alimenta o orçamento com composições SINAPI específicas.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map(([disc, entry]) => (
          <DisciplineEntry key={disc} projectId={projectId} disciplina={disc} entry={entry} />
        ))}
      </CardContent>
    </Card>
  );
}

function DisciplineEntry({
  projectId,
  disciplina,
  entry,
}: {
  projectId: string;
  disciplina: Exclude<Disciplina, "architectural">;
  entry: ExtracaoDisciplinaEntry;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const res = await confirmDisciplineExtractionAction({
        project_id: projectId,
        disciplina,
      });
      if (res.ok) {
        toast.success(`${DISCIPLINA_LABEL[disciplina]} confirmado`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  const confianca = (entry.data as { confianca?: "alta" | "media" | "baixa" })?.confianca;
  const summary = summarize(disciplina, entry.data);

  return (
    <div className="rounded-md border p-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{DISCIPLINA_LABEL[disciplina]}</p>
          {confianca ? (
            <Badge
              variant={
                confianca === "alta"
                  ? "default"
                  : confianca === "media"
                    ? "secondary"
                    : "destructive"
              }
            >
              Confiança: {confianca}
            </Badge>
          ) : null}
          {entry.confirmed_by_user ? (
            <Badge variant="outline">✓ Confirmado</Badge>
          ) : (
            <Badge variant="outline">Aguardando revisão</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant={entry.confirmed_by_user ? "outline" : "default"}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Salvando…" : entry.confirmed_by_user ? "Re-confirmar" : "Confirmar"}
        </Button>
      </div>
      <ul className="mt-2 grid gap-1 text-xs text-zinc-600 sm:grid-cols-2 dark:text-zinc-400">
        {summary.map((s, i) => (
          <li key={i}>
            <span className="text-zinc-500">{s.label}:</span>{" "}
            <span className="font-medium">{s.value}</span>
          </li>
        ))}
      </ul>
      {entry.prompt_version ? (
        <p className="mt-1 text-[10px] text-zinc-400">
          prompt {entry.prompt_version}
          {entry.usd_cost ? ` · custo IA $${entry.usd_cost.toFixed(4)}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function summarize(
  disc: Exclude<Disciplina, "architectural">,
  data: Record<string, unknown>,
): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  const num = (v: unknown) => (typeof v === "number" ? v.toLocaleString("pt-BR") : "—");
  const str = (v: unknown) => (typeof v === "string" ? v : "—");

  switch (disc) {
    case "electrical": {
      const d = data as {
        total_tomadas?: number | null;
        total_interruptores?: number | null;
        total_luminarias?: number | null;
        circuitos?: unknown[];
        quadro_distribuicao?: {
          disjuntores_total?: number | null;
          tem_dr?: boolean;
          tem_dps?: boolean;
        };
      };
      out.push({ label: "Tomadas", value: num(d.total_tomadas) });
      out.push({ label: "Interruptores", value: num(d.total_interruptores) });
      out.push({ label: "Luminárias", value: num(d.total_luminarias) });
      out.push({ label: "Circuitos", value: String(d.circuitos?.length ?? 0) });
      out.push({ label: "Disjuntores", value: num(d.quadro_distribuicao?.disjuntores_total) });
      out.push({
        label: "DR/DPS",
        value: `${d.quadro_distribuicao?.tem_dr ? "DR ✓" : "DR ✗"} · ${d.quadro_distribuicao?.tem_dps ? "DPS ✓" : "DPS ✗"}`,
      });
      break;
    }
    case "hydraulic": {
      const d = data as {
        total_pontos_agua_fria?: number | null;
        total_pontos_agua_quente?: number | null;
        total_pontos_esgoto?: number | null;
        total_ralos?: number | null;
        reservatorio?: { capacidade_l?: number | null; elevado?: boolean };
        tratamento_esgoto?: { tem_fossa_septica?: boolean };
      };
      out.push({ label: "Pts água fria", value: num(d.total_pontos_agua_fria) });
      out.push({ label: "Pts água quente", value: num(d.total_pontos_agua_quente) });
      out.push({ label: "Pts esgoto", value: num(d.total_pontos_esgoto) });
      out.push({ label: "Ralos", value: num(d.total_ralos) });
      out.push({
        label: "Caixa d'água",
        value: d.reservatorio?.capacidade_l ? `${d.reservatorio.capacidade_l} L` : "—",
      });
      out.push({
        label: "Fossa séptica",
        value: d.tratamento_esgoto?.tem_fossa_septica ? "Sim" : "Não",
      });
      break;
    }
    case "structural": {
      const d = data as {
        sistema_estrutural?: string;
        fundacao?: { tipo?: string };
        fck_mpa?: number | null;
        pilares?: { quantidade?: number | null; secao_cm?: string | null };
        vigas?: { quantidade?: number | null };
        volume_concreto_m3?: number | null;
        aco_kg_total?: number | null;
      };
      out.push({ label: "Sistema", value: str(d.sistema_estrutural).replace(/_/g, " ") });
      out.push({ label: "Fundação", value: str(d.fundacao?.tipo).replace(/_/g, " ") });
      out.push({ label: "fck", value: d.fck_mpa ? `${d.fck_mpa} MPa` : "—" });
      out.push({ label: "Pilares", value: num(d.pilares?.quantidade) });
      out.push({ label: "Vigas", value: num(d.vigas?.quantidade) });
      out.push({
        label: "Concreto",
        value: d.volume_concreto_m3 ? `${d.volume_concreto_m3} m³` : "—",
      });
      out.push({ label: "Aço CA-50", value: d.aco_kg_total ? `${d.aco_kg_total} kg` : "—" });
      break;
    }
    case "gas": {
      const d = data as {
        tipo?: string;
        total_pontos?: number | null;
        tubulacao_cobre_metros?: number | null;
        registros?: number | null;
        central_glp?: { capacidade_kg?: number | null; qtd_cilindros?: number | null };
      };
      out.push({ label: "Tipo", value: str(d.tipo).toUpperCase() });
      out.push({ label: "Pontos", value: num(d.total_pontos) });
      out.push({
        label: "Tubulação",
        value: d.tubulacao_cobre_metros ? `${d.tubulacao_cobre_metros} m` : "—",
      });
      out.push({ label: "Registros", value: num(d.registros) });
      out.push({
        label: "Central GLP",
        value: d.central_glp?.capacidade_kg
          ? `${d.central_glp.capacidade_kg} kg (${d.central_glp.qtd_cilindros ?? "?"} cil.)`
          : "—",
      });
      break;
    }
    case "hvac": {
      const d = data as {
        sistema?: string;
        total_splits?: number | null;
        capacidade_total_btu?: number | null;
        duto_metros?: number | null;
      };
      out.push({ label: "Sistema", value: str(d.sistema).replace(/_/g, " ") });
      out.push({ label: "Splits", value: num(d.total_splits) });
      out.push({
        label: "Total BTU",
        value: d.capacidade_total_btu
          ? `${d.capacidade_total_btu.toLocaleString("pt-BR")} BTU`
          : "—",
      });
      if (d.duto_metros) out.push({ label: "Dutos", value: `${d.duto_metros} m` });
      break;
    }
  }
  return out;
}
