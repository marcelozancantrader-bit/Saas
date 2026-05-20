"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CIDADES, type CidadeData } from "@/lib/zoneamento/cidades";
import { MUNICIPIOS_BR, municipioDisplay } from "@/lib/zoneamento/municipios-br";
import {
  listZonasCidadeIaAction,
  type ListZonasIaResult,
} from "@/server/actions/zoneamento/list-zonas-ia.action";
import { saveZoneamentoCustomAction } from "@/server/actions/zoneamento/save-custom.action";
import { toast } from "sonner";
import { SparklesIcon } from "lucide-react";

type ZonaIA = (ListZonasIaResult & { ok: true })["data"]["zonas"][number];

type Props = {
  initialCidade?: string | null;
  initialZona?: string | null;
  initialAreaTerreno?: number | null;
  disabled?: boolean;
  projectId?: string;
  /** Quando o projeto tem zoneamento_custom salvo, passa o resumo aqui pra mostrar. */
  customLabel?: string | null;
};

// Lista combinada: cidades curadas (com badge) + top 170 municípios BR
type SugestaoCidade = {
  display: string; // "Curitiba/PR"
  curada?: CidadeData;
};

function buildSugestoes(): SugestaoCidade[] {
  const curadas = new Set<string>();
  const out: SugestaoCidade[] = [];

  // Curadas primeiro
  for (const c of Object.values(CIDADES)) {
    const key = `${c.nome}/${c.uf}`;
    if (curadas.has(key)) continue;
    curadas.add(key);
    out.push({ display: key, curada: c });
  }
  // Top municípios brasileiros
  for (const m of MUNICIPIOS_BR) {
    const key = `${m.nome}/${m.uf}`;
    if (curadas.has(key)) continue;
    curadas.add(key);
    out.push({ display: key });
  }
  return out;
}

const SUGESTOES = buildSugestoes();

/** Procura curadoria pelo nome+UF digitado. */
function findCidadeCurada(cidadeDisplay: string): CidadeData | null {
  return SUGESTOES.find((s) => s.display === cidadeDisplay)?.curada ?? null;
}

/** Idade da lei pra warning visual */
function idadeLei(
  ano: number | null,
  revisao: number | null,
): {
  anos: number;
  isAntiga: boolean;
  refAno: number;
} | null {
  const refAno = revisao ?? ano;
  if (!refAno) return null;
  const anoAtual = new Date().getFullYear();
  const anos = anoAtual - refAno;
  return { anos, isAntiga: anos > 10, refAno };
}

/** Extrai ano da string da lei (ex: "LC 434/1999" → 1999) */
function extractAnoFromLei(lei: string): number | null {
  const m = lei.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

export function ZoneamentoFields({
  initialCidade,
  initialZona,
  initialAreaTerreno,
  disabled,
  projectId,
  customLabel,
}: Props) {
  const router = useRouter();

  // Estado: display da cidade selecionada (formato "Nome/UF")
  const [cidadeDisplay, setCidadeDisplay] = useState<string>(() => {
    if (initialCidade && initialCidade !== "custom") {
      const c = CIDADES[initialCidade];
      if (c) return `${c.nome}/${c.uf}`;
    }
    return customLabel?.split("·")[0]?.trim() ?? "";
  });
  const [zona, setZona] = useState<string>(initialZona ?? "");
  const [zonasIa, setZonasIa] = useState<ZonaIA[]>([]);
  const [iaMeta, setIaMeta] = useState<{
    lei: string;
    ano_lei: number | null;
    ultima_revisao_ano: number | null;
    fonte_url: string | null;
    confianca: "alta" | "media" | "baixa" | null;
  } | null>(null);
  const [iaLoading, setIaLoading] = useState(false);
  const [saving, startSaving] = useTransition();

  const cidadeCurada = useMemo(() => findCidadeCurada(cidadeDisplay), [cidadeDisplay]);
  const isCustomMode = !cidadeCurada && cidadeDisplay.trim() !== "";
  const cidadeCodigoForForm = cidadeCurada ? cidadeCurada.codigo : isCustomMode ? "custom" : "";

  // Pra cidade curada: mostra ano extraído da lei
  const curadaIdade = useMemo(() => {
    if (!cidadeCurada) return null;
    const ano = extractAnoFromLei(cidadeCurada.lei);
    return idadeLei(ano, null);
  }, [cidadeCurada]);

  // Pra cidade custom: usa metadata da IA
  const customIdade = useMemo(() => {
    if (!iaMeta) return null;
    return idadeLei(iaMeta.ano_lei, iaMeta.ultima_revisao_ano);
  }, [iaMeta]);

  /** Quando user muda a cidade, reseta zona e estado IA. */
  function onCidadeChange(value: string) {
    setCidadeDisplay(value);
    setZona("");
    setZonasIa([]);
    setIaMeta(null);
  }

  /** Busca zonas da cidade via IA. */
  async function buscarZonasComIa() {
    if (!isCustomMode) return;
    const [nome, uf] = cidadeDisplay.split("/").map((s) => s.trim());
    if (!nome || !uf || uf.length !== 2) {
      toast.error("Digite a cidade no formato 'Nome/UF' (ex: Florianópolis/SC)");
      return;
    }
    setIaLoading(true);
    try {
      const res = await listZonasCidadeIaAction({ cidade_nome: nome, uf: uf.toUpperCase() });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const d = res.data;
      setZonasIa(d.zonas);
      setIaMeta({
        lei: d.lei,
        ano_lei: d.ano_lei,
        ultima_revisao_ano: d.ultima_revisao_ano,
        fonte_url: d.fonte_url,
        confianca: d.confianca,
      });
      const dataInfo = d.ultima_revisao_ano
        ? `lei ${d.ano_lei}, revisada em ${d.ultima_revisao_ano}`
        : d.ano_lei
          ? `lei de ${d.ano_lei}`
          : "data não identificada";
      toast.success(
        `IA encontrou ${d.zonas.length} zona(s) (${dataInfo}, confiança ${d.confianca}). Escolha uma.`,
      );
    } finally {
      setIaLoading(false);
    }
  }

  /** Salva zoneamento custom no projeto (cidade não-curada + zona IA escolhida). */
  function salvarCustom(zonaCodigo: string) {
    if (!projectId || !iaMeta) return;
    const z = zonasIa.find((x) => x.zona_codigo === zonaCodigo);
    if (!z) return;
    const [nome, uf] = cidadeDisplay.split("/").map((s) => s.trim());
    if (!nome || !uf) return;

    startSaving(async () => {
      const res = await saveZoneamentoCustomAction({
        project_id: projectId,
        cidade_nome: nome,
        uf: uf.toUpperCase(),
        lei: iaMeta.lei,
        ano_lei: iaMeta.ano_lei,
        ultima_revisao_ano: iaMeta.ultima_revisao_ano,
        fonte_url: iaMeta.fonte_url,
        zona_codigo: z.zona_codigo,
        zona_label: z.zona_label,
        ca_basico: z.ca_basico,
        ca_maximo: z.ca_maximo,
        to_max_pct: z.to_max_pct,
        permeabilidade_min_pct: z.permeabilidade_min_pct,
        altura_max_m: z.altura_max_m,
        recuo_frontal_m: z.recuo_frontal_m,
        recuo_lateral_m: z.recuo_lateral_m,
        recuo_fundos_m: z.recuo_fundos_m,
        vagas_por_unidade: z.vagas_por_unidade,
        origem: "ia",
        confianca: iaMeta.confianca,
        observacao: z.observacao,
      });
      if (res.ok) {
        toast.success("Zoneamento personalizado salvo");
        router.refresh();
      } else if ("error" in res) {
        toast.error(res.error);
      }
    });
  }

  function onZonaChange(value: string) {
    setZona(value);
    if (isCustomMode && zonasIa.length > 0) {
      salvarCustom(value);
    }
  }

  const zonas = cidadeCurada?.zonas ?? [];
  const showIA = isCustomMode && zonasIa.length === 0;
  const showSelectIA = isCustomMode && zonasIa.length > 0;
  const zonaEscolhidaIA = useMemo(
    () => (showSelectIA ? zonasIa.find((z) => z.zona_codigo === zona) : null),
    [showSelectIA, zonasIa, zona],
  );

  return (
    <div className="space-y-3">
      {/* Hidden inputs pro form submit (ProjectForm) */}
      <input type="hidden" name="cidade_codigo" value={cidadeCodigoForForm} />
      <input type="hidden" name="zoneamento" value={zona} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="zon_cidade">Cidade da obra</Label>
          <Input
            id="zon_cidade"
            list="zon_cidades_datalist"
            value={cidadeDisplay}
            onChange={(e) => onCidadeChange(e.target.value)}
            disabled={disabled}
            placeholder="Digite — sugestões aparecem"
            autoComplete="off"
          />
          <datalist id="zon_cidades_datalist">
            {SUGESTOES.map((s) => (
              <option key={s.display} value={s.display}>
                {s.curada ? "★ Curado" : ""}
              </option>
            ))}
          </datalist>
          {cidadeCurada ? (
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              ★ Cidade curada — regras validadas manualmente.
            </p>
          ) : isCustomMode ? (
            <p className="text-[10px] text-zinc-500">
              Cidade fora da curadoria — clique em &quot;Buscar zonas com IA&quot; abaixo.
            </p>
          ) : (
            <p className="text-[10px] text-zinc-500">
              {SUGESTOES.length} cidades sugeridas (capitais + grandes municípios). Digite livre se
              não estiver listada.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="zon_zona">Zona do plano diretor</Label>
          {cidadeCurada ? (
            <Select value={zona} onValueChange={(v) => v && onZonaChange(v)} disabled={disabled}>
              <SelectTrigger id="zon_zona" className="w-full">
                <SelectValue placeholder="— Selecionar zona —" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {zonas.map((z) => (
                    <SelectItem key={z.zona} value={z.zona}>
                      {z.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : showSelectIA ? (
            <Select
              value={zona}
              onValueChange={(v) => v && onZonaChange(v)}
              disabled={disabled || saving}
            >
              <SelectTrigger id="zon_zona" className="w-full">
                <SelectValue placeholder="— Selecionar zona (IA) —" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {zonasIa.map((z) => (
                    <SelectItem key={z.zona_codigo} value={z.zona_codigo}>
                      {z.zona_label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="zon_zona"
              value=""
              disabled
              placeholder={
                isCustomMode ? "Busque as zonas com IA primeiro" : "Escolha a cidade primeiro"
              }
            />
          )}
        </div>
      </div>

      {/* Botão de buscar com IA — só aparece quando cidade fora da curadoria */}
      {showIA ? (
        <div className="flex items-center gap-3 rounded-md border border-dashed border-purple-300 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950">
          <SparklesIcon className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
          <div className="flex-1 text-xs text-purple-900 dark:text-purple-100">
            Esta cidade não está na curadoria. A IA pode buscar as zonas residenciais do plano
            diretor de <b>{cidadeDisplay}</b>.
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={buscarZonasComIa}
            disabled={disabled || iaLoading}
          >
            {iaLoading ? "Buscando…" : "Buscar zonas com IA"}
          </Button>
        </div>
      ) : null}

      {/* Área do terreno */}
      <div className="space-y-1.5">
        <Label htmlFor="area_terreno_m2">Área do terreno (lote) em m²</Label>
        <Input
          id="area_terreno_m2"
          name="area_terreno_m2"
          type="number"
          step="0.01"
          min="0"
          defaultValue={initialAreaTerreno ?? ""}
          disabled={disabled}
          placeholder="Ex: 360"
        />
        <p className="text-xs text-zinc-500">
          Necessário para calcular taxa de ocupação e coeficiente de aproveitamento.
        </p>
      </div>

      {/* Card de dados da lei — aparece quando cidade está definida */}
      {cidadeCurada || iaMeta ? (
        <div
          className={`rounded-md border p-3 ${
            curadaIdade?.isAntiga || customIdade?.isAntiga
              ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
              : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
              {cidadeCurada ? (
                <>
                  ★ Regras curadas: <strong>{cidadeCurada.lei}</strong>
                </>
              ) : (
                <>
                  🤖 IA · <strong>{iaMeta?.lei}</strong>
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {iaMeta?.confianca ? (
                <Badge
                  variant={
                    iaMeta.confianca === "alta"
                      ? "default"
                      : iaMeta.confianca === "media"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  Confiança: {iaMeta.confianca}
                </Badge>
              ) : null}
              {(curadaIdade ?? customIdade) ? (
                <Badge
                  variant={
                    curadaIdade?.isAntiga || customIdade?.isAntiga ? "destructive" : "default"
                  }
                >
                  📅 {(curadaIdade ?? customIdade)!.refAno} · {(curadaIdade ?? customIdade)!.anos}{" "}
                  anos
                </Badge>
              ) : null}
            </div>
          </div>

          {curadaIdade?.isAntiga || customIdade?.isAntiga ? (
            <p className="mt-2 text-[11px] font-medium text-amber-900 dark:text-amber-100">
              ⚠ Lei com mais de 10 anos sem revisão registrada. Confirme com a prefeitura se há
              decretos/leis complementares recentes antes de aprovar o projeto.
            </p>
          ) : null}

          {cidadeCurada?.fonte_url || iaMeta?.fonte_url ? (
            <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
              <a
                href={cidadeCurada?.fonte_url ?? iaMeta?.fonte_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Fonte oficial
              </a>
            </p>
          ) : null}

          {/* Parâmetros da zona escolhida (resumo visual) */}
          {(() => {
            const zonaCurada = cidadeCurada?.zonas.find((z) => z.zona === zona);
            const params = zonaCurada
              ? {
                  ca_basico: zonaCurada.ca_basico,
                  ca_maximo: zonaCurada.ca_maximo,
                  to_max_pct: zonaCurada.to_max_pct,
                  altura_max_m: zonaCurada.altura_max_m,
                  recuo_frontal_m: zonaCurada.recuo_frontal_m,
                  vagas_por_unidade: zonaCurada.vagas_por_unidade,
                }
              : zonaEscolhidaIA
                ? {
                    ca_basico: zonaEscolhidaIA.ca_basico,
                    ca_maximo: zonaEscolhidaIA.ca_maximo,
                    to_max_pct: zonaEscolhidaIA.to_max_pct,
                    altura_max_m: zonaEscolhidaIA.altura_max_m,
                    recuo_frontal_m: zonaEscolhidaIA.recuo_frontal_m,
                    vagas_por_unidade: zonaEscolhidaIA.vagas_por_unidade,
                  }
                : null;
            if (!params) return null;
            return (
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-700 sm:grid-cols-3 dark:text-zinc-300">
                <div>
                  <span className="text-zinc-500">CA:</span>{" "}
                  <strong>
                    {params.ca_basico}
                    {params.ca_maximo && params.ca_maximo !== params.ca_basico
                      ? ` / ${params.ca_maximo}`
                      : ""}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500">TO:</span> <strong>{params.to_max_pct}%</strong>
                </div>
                <div>
                  <span className="text-zinc-500">Altura:</span>{" "}
                  <strong>{params.altura_max_m ? `${params.altura_max_m}m` : "—"}</strong>
                </div>
                <div>
                  <span className="text-zinc-500">Recuo:</span>{" "}
                  <strong>{params.recuo_frontal_m}m</strong>
                </div>
                <div>
                  <span className="text-zinc-500">Vagas/un:</span>{" "}
                  <strong>{params.vagas_por_unidade}</strong>
                </div>
                {saving ? (
                  <div className="text-purple-700 dark:text-purple-300">Salvando…</div>
                ) : null}
              </div>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
