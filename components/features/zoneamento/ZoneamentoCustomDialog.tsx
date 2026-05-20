"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fetchZoneamentoIaAction } from "@/server/actions/zoneamento/fetch-with-ai.action";
import {
  listZonasCidadeIaAction,
  type ListZonasIaResult,
} from "@/server/actions/zoneamento/list-zonas-ia.action";
import { saveZoneamentoCustomAction } from "@/server/actions/zoneamento/save-custom.action";
import { MUNICIPIOS_BR, municipioDisplay } from "@/lib/zoneamento/municipios-br";
import { toast } from "sonner";
import { SparklesIcon, MapPinIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ZonaIA = (ListZonasIaResult & { ok: true })["data"]["zonas"][number];

type Props = {
  projectId: string;
  initialAreaTerreno?: number | null;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
};

const UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
];

type FormState = {
  cidade_nome: string;
  uf: string;
  lei: string;
  ano_lei: string;
  ultima_revisao_ano: string;
  fonte_url: string;
  zona_codigo: string;
  zona_label: string;
  ca_basico: string;
  ca_maximo: string;
  to_max_pct: string;
  permeabilidade_min_pct: string;
  altura_max_m: string;
  recuo_frontal_m: string;
  recuo_lateral_m: string;
  recuo_fundos_m: string;
  vagas_por_unidade: string;
  observacao: string;
  area_terreno_m2: string;
};

const EMPTY: FormState = {
  cidade_nome: "",
  uf: "SP",
  lei: "",
  ano_lei: "",
  ultima_revisao_ano: "",
  fonte_url: "",
  zona_codigo: "",
  zona_label: "",
  ca_basico: "",
  ca_maximo: "",
  to_max_pct: "",
  permeabilidade_min_pct: "",
  altura_max_m: "",
  recuo_frontal_m: "",
  recuo_lateral_m: "",
  recuo_fundos_m: "",
  vagas_por_unidade: "1",
  observacao: "",
  area_terreno_m2: "",
};

/** Calcula idade da lei pra exibir warning visual. */
function idadeLei(form: FormState): {
  anos: number | null;
  isAntiga: boolean;
  refAno: number | null;
} {
  const refAno = form.ultima_revisao_ano
    ? Number(form.ultima_revisao_ano)
    : form.ano_lei
      ? Number(form.ano_lei)
      : null;
  if (!refAno) return { anos: null, isAntiga: false, refAno: null };
  const anoAtual = new Date().getFullYear();
  const anos = anoAtual - refAno;
  return { anos, isAntiga: anos > 10, refAno };
}

export function ZoneamentoCustomDialog({
  projectId,
  initialAreaTerreno,
  triggerLabel = "Outra cidade (manual ou IA)",
  triggerVariant = "outline",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    area_terreno_m2: initialAreaTerreno?.toString() ?? "",
  });
  const [confianca, setConfianca] = useState<"alta" | "media" | "baixa" | null>(null);
  const [origem, setOrigem] = useState<"manual" | "ia">("manual");
  const [iaLoading, setIaLoading] = useState(false);
  const [zonasIa, setZonasIa] = useState<ZonaIA[]>([]);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof FormState>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  /** Tenta auto-detectar UF quando user digita "Cidade/UF" no campo cidade. */
  function onCidadeChange(value: string) {
    const m = value.match(/^(.+?)\/([A-Z]{2})$/);
    if (m) {
      // Selecionou item do datalist no formato "Nome/UF"
      setForm((p) => ({ ...p, cidade_nome: m[1]!.trim(), uf: m[2]! }));
    } else {
      update("cidade_nome", value);
    }
  }

  /**
   * Passo 1: pede pra IA listar as zonas residenciais da cidade.
   * Resultado popula o Select de zona. User escolhe uma → preenche o resto.
   */
  async function buscarZonasComIa() {
    if (!form.cidade_nome.trim() || !form.uf) {
      toast.error("Preencha cidade + UF antes de buscar zonas");
      return;
    }
    setIaLoading(true);
    try {
      const res = await listZonasCidadeIaAction({
        cidade_nome: form.cidade_nome.trim(),
        uf: form.uf as string,
      });
      if (!res.ok) {
        toast.error(res.error);
        setZonasIa([]);
        return;
      }
      const d = res.data;
      setZonasIa(d.zonas);
      // Preenche metadados da cidade (lei, ano, fonte) — zona vem depois
      setForm((p) => ({
        ...p,
        cidade_nome: d.cidade_nome,
        uf: d.uf,
        lei: d.lei,
        ano_lei: d.ano_lei?.toString() ?? "",
        ultima_revisao_ano: d.ultima_revisao_ano?.toString() ?? "",
        fonte_url: d.fonte_url ?? "",
        // Reseta zona pro user escolher da nova lista
        zona_codigo: "",
        zona_label: "",
        ca_basico: "",
        ca_maximo: "",
        to_max_pct: "",
        permeabilidade_min_pct: "",
        altura_max_m: "",
        recuo_frontal_m: "",
        recuo_lateral_m: "",
        recuo_fundos_m: "",
        vagas_por_unidade: "1",
        observacao: "",
      }));
      setConfianca(d.confianca);
      setOrigem("ia");
      const dataInfo = d.ultima_revisao_ano
        ? `lei ${d.ano_lei}, revisada em ${d.ultima_revisao_ano}`
        : d.ano_lei
          ? `lei de ${d.ano_lei}`
          : "data não identificada";
      toast.success(
        `IA encontrou ${d.zonas.length} zona(s) residencial(is) (${dataInfo}). Escolha uma no campo abaixo.`,
      );
    } finally {
      setIaLoading(false);
    }
  }

  /**
   * Passo 2: user escolhe uma zona da lista populada pela IA. Preenche o
   * formulário sem nova chamada de IA (parâmetros já vieram no list).
   */
  function escolherZona(codigo: string) {
    const z = zonasIa.find((x) => x.zona_codigo === codigo);
    if (!z) return;
    setForm((p) => ({
      ...p,
      zona_codigo: z.zona_codigo,
      zona_label: z.zona_label,
      ca_basico: z.ca_basico.toString(),
      ca_maximo: z.ca_maximo?.toString() ?? "",
      to_max_pct: z.to_max_pct.toString(),
      permeabilidade_min_pct: z.permeabilidade_min_pct?.toString() ?? "",
      altura_max_m: z.altura_max_m?.toString() ?? "",
      recuo_frontal_m: z.recuo_frontal_m.toString(),
      recuo_lateral_m: z.recuo_lateral_m?.toString() ?? "",
      recuo_fundos_m: z.recuo_fundos_m?.toString() ?? "",
      vagas_por_unidade: z.vagas_por_unidade.toString(),
      observacao: z.observacao ?? "",
    }));
  }

  /** Fallback: busca parâmetros de UMA zona específica pelo nome digitado. */
  async function buscarParametrosZonaEspecifica() {
    if (!form.cidade_nome.trim() || !form.uf || !form.zona_label.trim()) {
      toast.error("Cidade, UF e nome da zona são obrigatórios");
      return;
    }
    setIaLoading(true);
    try {
      const res = await fetchZoneamentoIaAction({
        cidade_nome: form.cidade_nome.trim(),
        uf: form.uf as string,
        zona_nome: form.zona_label.trim(),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const d = res.data;
      setForm((p) => ({
        ...p,
        lei: d.lei,
        ano_lei: d.ano_lei?.toString() ?? "",
        ultima_revisao_ano: d.ultima_revisao_ano?.toString() ?? "",
        fonte_url: d.fonte_url ?? "",
        zona_codigo: d.zona_codigo,
        zona_label: d.zona_label,
        ca_basico: d.ca_basico.toString(),
        ca_maximo: d.ca_maximo?.toString() ?? "",
        to_max_pct: d.to_max_pct.toString(),
        permeabilidade_min_pct: d.permeabilidade_min_pct?.toString() ?? "",
        altura_max_m: d.altura_max_m?.toString() ?? "",
        recuo_frontal_m: d.recuo_frontal_m.toString(),
        recuo_lateral_m: d.recuo_lateral_m?.toString() ?? "",
        recuo_fundos_m: d.recuo_fundos_m?.toString() ?? "",
        vagas_por_unidade: d.vagas_por_unidade.toString(),
        observacao: d.observacao ?? "",
      }));
      setConfianca(d.confianca);
      setOrigem("ia");
      toast.success("Parâmetros preenchidos.");
    } finally {
      setIaLoading(false);
    }
  }

  function salvar() {
    if (
      !form.cidade_nome.trim() ||
      !form.uf ||
      !form.zona_codigo.trim() ||
      !form.zona_label.trim()
    ) {
      toast.error("Cidade, UF, código e nome da zona são obrigatórios");
      return;
    }
    if (!form.ca_basico || !form.to_max_pct || !form.recuo_frontal_m) {
      toast.error("CA básico, TO máximo e recuo frontal são obrigatórios");
      return;
    }
    startTransition(async () => {
      const res = await saveZoneamentoCustomAction({
        project_id: projectId,
        cidade_nome: form.cidade_nome.trim(),
        uf: form.uf as string,
        lei: form.lei.trim() || "Não informado",
        ano_lei: form.ano_lei === "" ? null : Number(form.ano_lei),
        ultima_revisao_ano: form.ultima_revisao_ano === "" ? null : Number(form.ultima_revisao_ano),
        fonte_url: form.fonte_url.trim() || null,
        zona_codigo: form.zona_codigo.trim().toLowerCase().replace(/\s+/g, "-"),
        zona_label: form.zona_label.trim(),
        ca_basico: Number(form.ca_basico),
        ca_maximo: form.ca_maximo === "" ? null : Number(form.ca_maximo),
        to_max_pct: Number(form.to_max_pct),
        permeabilidade_min_pct:
          form.permeabilidade_min_pct === "" ? null : Number(form.permeabilidade_min_pct),
        altura_max_m: form.altura_max_m === "" ? null : Number(form.altura_max_m),
        recuo_frontal_m: Number(form.recuo_frontal_m),
        recuo_lateral_m: form.recuo_lateral_m === "" ? null : Number(form.recuo_lateral_m),
        recuo_fundos_m: form.recuo_fundos_m === "" ? null : Number(form.recuo_fundos_m),
        vagas_por_unidade: Number(form.vagas_por_unidade) || 1,
        origem,
        confianca,
        observacao: form.observacao.trim() || null,
        area_terreno_m2: form.area_terreno_m2 === "" ? null : Number(form.area_terreno_m2),
      });
      if (res.ok) {
        toast.success("Zoneamento personalizado salvo");
        setOpen(false);
        router.refresh();
      } else if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.error("Verifique os campos");
      }
    });
  }

  const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }));
  const busy = iaLoading || pending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={triggerVariant} size="sm" type="button">
            <MapPinIcon className="mr-1.5 h-3.5 w-3.5" />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Zoneamento de outra cidade</DialogTitle>
          <DialogDescription>
            Para cidades fora da nossa curadoria, insira os parâmetros do plano diretor manualmente
            — ou peça pra IA buscar e preencha o formulário pra sua revisão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Identificação da cidade (com autocomplete) */}
          <div className="grid gap-3 sm:grid-cols-[1fr_80px]">
            <div className="space-y-1.5">
              <Label htmlFor="zc_cidade">Cidade da obra</Label>
              <Input
                id="zc_cidade"
                list="zc_cidades_datalist"
                value={form.cidade_nome}
                onChange={(e) => onCidadeChange(e.target.value)}
                disabled={busy}
                placeholder="Digite — sugestões aparecem"
                autoComplete="off"
              />
              <datalist id="zc_cidades_datalist">
                {MUNICIPIOS_BR.map((m) => (
                  <option key={`${m.nome}-${m.uf}`} value={municipioDisplay(m)} />
                ))}
              </datalist>
              <p className="text-[10px] text-zinc-500">
                Top {MUNICIPIOS_BR.length} municípios sugeridos. Digite livre se a cidade não
                estiver listada.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zc_uf">UF</Label>
              <select
                id="zc_uf"
                value={form.uf}
                onChange={(e) => update("uf", e.target.value)}
                disabled={busy}
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                {ufOptions.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botão IA — lista zonas */}
          <div className="flex items-center gap-3 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <SparklesIcon className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
            <div className="flex-1 text-xs text-zinc-700 dark:text-zinc-300">
              A IA busca as zonas residenciais do plano diretor da cidade. Depois você escolhe uma
              zona e os parâmetros são preenchidos.
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={buscarZonasComIa}
              disabled={busy || !form.cidade_nome.trim()}
            >
              {iaLoading ? "Buscando…" : "Buscar zonas com IA"}
            </Button>
          </div>

          {/* Seleção de zona — Select se IA retornou zonas, senão input livre */}
          {zonasIa.length > 0 ? (
            <div className="space-y-1.5 rounded-md border border-purple-200 bg-purple-50 p-3 dark:border-purple-900 dark:bg-purple-950">
              <Label htmlFor="zc_zona_select">
                Escolha a zona ({zonasIa.length} encontrada{zonasIa.length !== 1 ? "s" : ""} pela
                IA)
              </Label>
              <Select
                value={form.zona_codigo}
                onValueChange={(v) => v && escolherZona(v)}
                disabled={busy}
              >
                <SelectTrigger id="zc_zona_select" className="w-full">
                  <SelectValue placeholder="— Selecionar zona —" />
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
              <p className="text-[10px] text-purple-700 dark:text-purple-300">
                Ao escolher, os parâmetros (CA, TO, recuos etc) são preenchidos automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="zc_zona_label">Nome da zona (do plano diretor)</Label>
                <Input
                  id="zc_zona_label"
                  value={form.zona_label}
                  onChange={(e) => update("zona_label", e.target.value)}
                  disabled={busy}
                  placeholder="Ex: AMC - Área Mista Central"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zc_zona_codigo">Código curto</Label>
                <Input
                  id="zc_zona_codigo"
                  value={form.zona_codigo}
                  onChange={(e) => update("zona_codigo", e.target.value)}
                  disabled={busy}
                  placeholder="amc, zm-3"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={buscarParametrosZonaEspecifica}
                  disabled={busy || !form.cidade_nome.trim() || !form.zona_label.trim()}
                  className="h-10"
                  title="Buscar parâmetros desta zona específica"
                >
                  {iaLoading ? "…" : "Buscar 1"}
                </Button>
              </div>
            </div>
          )}

          {confianca ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Confiança da IA:</span>
              <Badge
                variant={
                  confianca === "alta"
                    ? "default"
                    : confianca === "media"
                      ? "secondary"
                      : "destructive"
                }
              >
                {confianca}
              </Badge>
              {confianca === "baixa" ? (
                <span className="text-zinc-500">
                  Revise os valores cuidadosamente — IA não tem certeza.
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Lei + data em destaque */}
          <div
            className={`rounded-md border-2 p-3 ${
              idadeLei(form).isAntiga
                ? "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label className="text-sm font-semibold">📅 Data do plano diretor</Label>
              {(() => {
                const { anos, isAntiga, refAno } = idadeLei(form);
                if (!refAno) return null;
                return (
                  <Badge variant={isAntiga ? "destructive" : "default"}>
                    {anos === 0
                      ? "Vigente (este ano)"
                      : `${anos} ${anos === 1 ? "ano" : "anos"} desde ${refAno}`}
                    {isAntiga ? " ⚠ verificar revisão" : ""}
                  </Badge>
                );
              })()}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="zc_lei" className="text-xs">
                  Lei municipal
                </Label>
                <Input
                  id="zc_lei"
                  value={form.lei}
                  onChange={(e) => update("lei", e.target.value)}
                  disabled={busy}
                  placeholder="Ex: LC 482/2014 (Plano Diretor)"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="zc_ano_lei" className="text-xs">
                    Ano da lei *
                  </Label>
                  <Input
                    id="zc_ano_lei"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    step="1"
                    value={form.ano_lei}
                    onChange={(e) => update("ano_lei", e.target.value)}
                    disabled={busy}
                    placeholder="Ex: 1999"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zc_revisao" className="text-xs">
                    Última revisão
                  </Label>
                  <Input
                    id="zc_revisao"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    step="1"
                    value={form.ultima_revisao_ano}
                    onChange={(e) => update("ultima_revisao_ano", e.target.value)}
                    disabled={busy}
                    placeholder="Vazio se nunca"
                  />
                </div>
              </div>
            </div>
            {idadeLei(form).isAntiga ? (
              <p className="mt-2 text-xs font-medium text-amber-900 dark:text-amber-100">
                ⚠ <strong>Atenção:</strong> esta lei tem mais de 10 anos sem revisão. Confirme com a
                prefeitura se está vigente e se há decretos/leis complementares recentes.
              </p>
            ) : null}
            <div className="mt-2 space-y-1.5">
              <Label htmlFor="zc_fonte" className="text-xs">
                URL da lei/plano diretor (opcional)
              </Label>
              <Input
                id="zc_fonte"
                value={form.fonte_url}
                onChange={(e) => update("fonte_url", e.target.value)}
                disabled={busy}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Parâmetros urbanísticos */}
          <div className="rounded-md border p-3 dark:border-zinc-800">
            <p className="mb-2 text-sm font-medium">Parâmetros da zona</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="CA básico *"
                hint="ex: 1.0"
                value={form.ca_basico}
                onChange={(v) => update("ca_basico", v)}
                disabled={busy}
                type="number"
                step="0.1"
              />
              <Field
                label="CA máximo (outorga)"
                hint="Vazio se igual ao básico"
                value={form.ca_maximo}
                onChange={(v) => update("ca_maximo", v)}
                disabled={busy}
                type="number"
                step="0.1"
              />
              <Field
                label="TO máxima (%) *"
                hint="ex: 50"
                value={form.to_max_pct}
                onChange={(v) => update("to_max_pct", v)}
                disabled={busy}
                type="number"
                step="0.5"
              />
              <Field
                label="Permeabilidade mín. (%)"
                hint="ex: 25"
                value={form.permeabilidade_min_pct}
                onChange={(v) => update("permeabilidade_min_pct", v)}
                disabled={busy}
                type="number"
                step="0.5"
              />
              <Field
                label="Altura máxima (m)"
                hint="Vazio se sem limite"
                value={form.altura_max_m}
                onChange={(v) => update("altura_max_m", v)}
                disabled={busy}
                type="number"
                step="0.5"
              />
              <Field
                label="Vagas / unidade *"
                hint="ex: 1"
                value={form.vagas_por_unidade}
                onChange={(v) => update("vagas_por_unidade", v)}
                disabled={busy}
                type="number"
                step="1"
              />
              <Field
                label="Recuo frontal (m) *"
                hint="ex: 4"
                value={form.recuo_frontal_m}
                onChange={(v) => update("recuo_frontal_m", v)}
                disabled={busy}
                type="number"
                step="0.5"
              />
              <Field
                label="Recuo lateral (m)"
                hint="Vazio se não obrigatório"
                value={form.recuo_lateral_m}
                onChange={(v) => update("recuo_lateral_m", v)}
                disabled={busy}
                type="number"
                step="0.5"
              />
              <Field
                label="Recuo fundos (m)"
                hint="Vazio se não obrigatório"
                value={form.recuo_fundos_m}
                onChange={(v) => update("recuo_fundos_m", v)}
                disabled={busy}
                type="number"
                step="0.5"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zc_area_terreno">Área do terreno (m²)</Label>
            <Input
              id="zc_area_terreno"
              type="number"
              step="0.01"
              min="0"
              value={form.area_terreno_m2}
              onChange={(e) => update("area_terreno_m2", e.target.value)}
              disabled={busy}
              placeholder="Ex: 360"
            />
          </div>

          {form.observacao ? (
            <div className="space-y-1.5">
              <Label htmlFor="zc_obs">Observação da IA</Label>
              <Input
                id="zc_obs"
                value={form.observacao}
                onChange={(e) => update("observacao", e.target.value)}
                disabled={busy}
              />
            </div>
          ) : null}

          <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            ⚠ Parâmetros{" "}
            {origem === "ia"
              ? "sugeridos pela IA — sempre confirme com a prefeitura"
              : "inseridos manualmente"}
            . A responsabilidade técnica é do profissional emissor.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={busy}>
            {pending ? "Salvando…" : "Salvar e usar nesse projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  disabled,
  type = "text",
  step,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={hint}
      />
    </div>
  );
}
