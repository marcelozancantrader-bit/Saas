import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { runZoneamentoChecks, runZoneamentoChecksCustom } from "@/lib/zoneamento/check";
import { getCidade, getZona, type ZoneamentoRule } from "@/lib/zoneamento/cidades";
import type { NbrFinding } from "@/lib/nbr-checks";

export type ZoneamentoCustomMeta = ZoneamentoRule & {
  cidade_nome?: string;
  uf?: string;
  lei?: string;
  fonte_url?: string | null;
  origem?: "manual" | "ia";
  confianca?: "alta" | "media" | "baixa" | null;
  observacao?: string | null;
};

type Props = {
  cidade_codigo: string | null;
  zona_codigo: string | null;
  area_terreno_m2: number | null;
  area_construida_total_m2: number | null;
  numero_pavimentos: number | null;
  tem_garagem: boolean;
  /** Quando cidade_codigo === 'custom', usa esses parâmetros vindos de meta.zoneamento_custom. */
  customRule?: ZoneamentoCustomMeta | null;
};

const SEVERITY_VARIANT: Record<NbrFinding["severity"], "default" | "secondary" | "destructive"> = {
  ok: "default",
  warn: "secondary",
  issue: "destructive",
};

const SEVERITY_LABEL: Record<NbrFinding["severity"], string> = {
  ok: "OK",
  warn: "Verificar",
  issue: "Atenção",
};

export function ZoneamentoCard({
  cidade_codigo,
  zona_codigo,
  area_terreno_m2,
  area_construida_total_m2,
  numero_pavimentos,
  tem_garagem,
  customRule,
}: Props) {
  const isCustom = cidade_codigo === "custom" && !!customRule;

  if (!cidade_codigo || (!isCustom && !zona_codigo)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Validação de zoneamento</CardTitle>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Selecione cidade + zona + área do terreno no formulário do projeto para validar taxa de
            ocupação, coeficiente de aproveitamento, altura, vagas e recuos.
          </p>
        </CardHeader>
      </Card>
    );
  }

  let findings: NbrFinding[];
  let headerNome: string;
  let headerLei: string;
  let headerFonte: string | null;
  let headerOrigem: "curado" | "manual" | "ia" = "curado";
  let confianca: "alta" | "media" | "baixa" | null = null;
  let observacao: string | null = null;

  if (isCustom && customRule) {
    findings = runZoneamentoChecksCustom({
      rule: customRule,
      area_terreno_m2: area_terreno_m2 ?? 0,
      area_construida_total_m2,
      numero_pavimentos,
      tem_garagem,
    });
    headerNome = `${customRule.cidade_nome ?? "Cidade"}/${customRule.uf ?? "??"} · ${customRule.label}`;
    headerLei = customRule.lei ?? "Não informado";
    headerFonte = customRule.fonte_url ?? null;
    headerOrigem = customRule.origem ?? "manual";
    confianca = customRule.confianca ?? null;
    observacao = customRule.observacao ?? null;
  } else {
    const cidade = getCidade(cidade_codigo);
    const zona = getZona(cidade_codigo, zona_codigo);
    if (!cidade || !zona) return null;
    findings = runZoneamentoChecks({
      cidade_codigo: cidade_codigo!,
      zona_codigo: zona_codigo!,
      area_terreno_m2: area_terreno_m2 ?? 0,
      area_construida_total_m2,
      numero_pavimentos,
      tem_garagem,
    });
    headerNome = `${cidade.nome}/${cidade.uf} · ${zona.label}`;
    headerLei = cidade.lei;
    headerFonte = cidade.fonte_url ?? null;
  }

  const issues = findings.filter((f) => f.severity === "issue").length;
  const warns = findings.filter((f) => f.severity === "warn").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Validação de zoneamento</CardTitle>
          <div className="flex gap-2 text-xs">
            {headerOrigem !== "curado" ? (
              <Badge variant="outline">
                {headerOrigem === "ia" ? "IA — confirmado" : "Manual"}
              </Badge>
            ) : null}
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
                Confiança IA: {confianca}
              </Badge>
            ) : null}
            {issues > 0 ? <Badge variant="destructive">{issues} acima do permitido</Badge> : null}
            {warns > 0 ? <Badge variant="secondary">{warns} para confirmar</Badge> : null}
          </div>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          <strong>{headerNome}</strong> · {headerLei}.
          {headerFonte ? (
            <>
              {" "}
              <a
                href={headerFonte}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Fonte oficial
              </a>
              .
            </>
          ) : null}
        </p>
        <p className="text-xs text-zinc-500">
          {headerOrigem === "curado"
            ? "Pré-validação curada — não substitui aprovação na prefeitura. Não cobre exceções (ZEIS, área histórica, lote de esquina)."
            : headerOrigem === "ia"
              ? "Parâmetros sugeridos por IA e confirmados pelo profissional. SEMPRE validar com a prefeitura antes de aprovar projeto definitivo."
              : "Parâmetros inseridos manualmente pelo profissional. SEMPRE validar com a prefeitura antes de aprovar projeto definitivo."}
        </p>
        {observacao ? (
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Observação: {observacao}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {findings.map((f) => (
            <li
              key={f.id}
              className="flex items-start gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <Badge variant={SEVERITY_VARIANT[f.severity]} className="shrink-0">
                {SEVERITY_LABEL[f.severity]}
              </Badge>
              <div className="min-w-0">
                <p className="font-medium">{f.rule}</p>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">{f.message}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
