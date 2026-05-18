"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitBriefingAction } from "@/server/actions/briefings/submit.action";
import {
  TIPO_OBRA,
  TIPO_OBRA_LABEL,
  ORCAMENTO_FAIXA,
  ORCAMENTO_LABEL,
  ESTILOS,
  ESTILO_LABEL,
  AMBIENTES_SUGERIDOS,
  type BriefingRespostas,
} from "@/lib/validators/briefing.schema";

type Props = { portalToken: string; projectId: string };

const INITIAL: BriefingRespostas = {
  tipo_obra: "construcao_nova",
  quartos: 3,
  banheiros: 2,
  suites: 1,
  vagas_garagem: 2,
  ambientes_especiais: [],
  estilo_preferido: "contemporaneo",
  orcamento_estimado: "500_800k",
  prazo_desejado_meses: 12,
  moradores: "",
  tem_pets: false,
  pets_detalhes: "",
  restricoes: "",
  inspiracoes: "",
  observacoes: "",
};

export function BriefingForm({ portalToken, projectId }: Props) {
  const [form, setForm] = useState<BriefingRespostas>(INITIAL);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof BriefingRespostas>(key: K, value: BriefingRespostas[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleAmbiente(ambiente: string) {
    setForm((f) => ({
      ...f,
      ambientes_especiais: f.ambientes_especiais.includes(ambiente)
        ? f.ambientes_especiais.filter((a) => a !== ambiente)
        : [...f.ambientes_especiais, ambiente],
    }));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const r = await submitBriefingAction({
        token: portalToken,
        project_id: projectId,
        respostas: form,
      });
      if (!r.ok) toast.error(r.error);
      else toast.success("Briefing enviado. Obrigado!");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Briefing inicial</CardTitle>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Conte um pouco sobre o que você imagina pra esse projeto. Quanto mais detalhe, mais rápido
          seu arquiteto entrega algo alinhado com o que você quer.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo de obra</Label>
            <Select
              value={form.tipo_obra}
              onValueChange={(v) => set("tipo_obra", v as BriefingRespostas["tipo_obra"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OBRA.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_OBRA_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Estilo preferido</Label>
            <Select
              value={form.estilo_preferido}
              onValueChange={(v) =>
                set("estilo_preferido", v as BriefingRespostas["estilo_preferido"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTILOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ESTILO_LABEL[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {(["quartos", "banheiros", "suites", "vagas_garagem"] as const).map((k) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={k} className="capitalize">
                {k.replace("_", " ")}
              </Label>
              <Input
                id={k}
                type="number"
                min={0}
                max={20}
                value={form[k]}
                onChange={(e) => set(k, Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Orçamento estimado</Label>
            <Select
              value={form.orcamento_estimado}
              onValueChange={(v) =>
                set("orcamento_estimado", v as BriefingRespostas["orcamento_estimado"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORCAMENTO_FAIXA.map((f) => (
                  <SelectItem key={f} value={f}>
                    {ORCAMENTO_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prazo">Prazo desejado (meses)</Label>
            <Input
              id="prazo"
              type="number"
              min={1}
              max={120}
              value={form.prazo_desejado_meses}
              onChange={(e) =>
                set("prazo_desejado_meses", Math.max(1, Number(e.target.value) || 1))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Ambientes especiais</Label>
          <p className="text-xs text-zinc-500">
            Marque o que faz sentido pra você. Não precisa marcar nada se for tudo padrão.
          </p>
          <div className="flex flex-wrap gap-2">
            {AMBIENTES_SUGERIDOS.map((a) => {
              const on = form.ambientes_especiais.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmbiente(a)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    on
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="moradores">Quem vai morar</Label>
          <Input
            id="moradores"
            value={form.moradores}
            onChange={(e) => set("moradores", e.target.value)}
            placeholder="Ex: casal + 2 filhos (8 e 12), eventual hóspede"
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.tem_pets}
              onChange={(e) => set("tem_pets", e.target.checked)}
            />
            <span>Tenho pets</span>
          </label>
          {form.tem_pets ? (
            <Input
              value={form.pets_detalhes}
              onChange={(e) => set("pets_detalhes", e.target.value)}
              placeholder="Ex: 2 cachorros médios, 1 gato — querem área externa"
              maxLength={300}
            />
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="restricoes">Restrições do terreno/projeto</Label>
          <Textarea
            id="restricoes"
            value={form.restricoes}
            onChange={(e) => set("restricoes", e.target.value)}
            rows={2}
            maxLength={1500}
            placeholder="Ex: terreno em declive, lote 12x30, condomínio com restrição de altura, vizinhança histórica…"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inspiracoes">Inspirações / referências</Label>
          <Textarea
            id="inspiracoes"
            value={form.inspiracoes}
            onChange={(e) => set("inspiracoes", e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Cole URLs de Pinterest/Instagram ou descreva projetos que te inspiraram."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="observacoes">Outras observações</Label>
          <Textarea
            id="observacoes"
            value={form.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Qualquer outra coisa que o arquiteto precise saber."
          />
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full sm:w-auto">
          {submitting ? "Enviando…" : "Enviar briefing"}
        </Button>
      </CardContent>
    </Card>
  );
}
