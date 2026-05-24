"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchSinapiAction, type SinapiRow } from "@/server/actions/budgets/search-sinapi.action";
import { addBudgetItemAction } from "@/server/actions/budgets/add-item.action";
import { formatBRL } from "@/lib/utils/money";
import { Search, PencilRuler } from "lucide-react";
import { toast } from "sonner";

type Props = {
  budgetId: string;
  uf: string;
  mesReferencia: string;
  desonerado: boolean;
};

type Mode = "sinapi" | "propria";

const UNIDADES_COMUNS = ["m", "m²", "m³", "un", "vb", "kg", "t", "L", "h", "cj", "pç", "par"];

export function AddItemDialog({ budgetId, uf, mesReferencia, desonerado }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("sinapi");
  const [, startAdd] = useTransition();

  // SINAPI tab state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SinapiRow[]>([]);
  const [searching, startSearch] = useTransition();
  const [qty, setQty] = useState("1");
  const [selected, setSelected] = useState<SinapiRow | null>(null);

  // Composição própria tab state
  const [propriaDesc, setPropriaDesc] = useState("");
  const [propriaUnidade, setPropriaUnidade] = useState("un");
  const [propriaQty, setPropriaQty] = useState("1");
  const [propriaPreco, setPropriaPreco] = useState("");

  function resetAll() {
    setQuery("");
    setResults([]);
    setQty("1");
    setSelected(null);
    setPropriaDesc("");
    setPropriaUnidade("un");
    setPropriaQty("1");
    setPropriaPreco("");
  }

  function doSearch() {
    if (query.trim().length < 2) {
      toast.error("Digite ao menos 2 caracteres");
      return;
    }
    startSearch(async () => {
      const r = await searchSinapiAction({
        query: query.trim(),
        uf,
        mes_referencia: mesReferencia,
        desonerado,
      });
      if (r.ok) {
        setResults(r.results);
        if (r.results.length === 0) toast.warning("Nenhum resultado");
      } else {
        toast.error(r.error);
      }
    });
  }

  function doAddSinapi() {
    if (!selected) {
      toast.error("Selecione uma composição");
      return;
    }
    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("Quantidade inválida");
      return;
    }
    startAdd(async () => {
      const r = await addBudgetItemAction({
        budget_id: budgetId,
        codigo: selected.codigo,
        descricao: selected.descricao,
        unidade: selected.unidade,
        quantidade: qtyNum,
        preco_unitario: selected.preco,
        origem: "sinapi",
      });
      if (r.ok) {
        toast.success("Item SINAPI adicionado");
        setOpen(false);
        resetAll();
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function doAddPropria() {
    const desc = propriaDesc.trim();
    if (desc.length < 3) {
      toast.error("Descrição precisa ter pelo menos 3 caracteres");
      return;
    }
    const qtyNum = Number(propriaQty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("Quantidade inválida");
      return;
    }
    const precoNum = Number(propriaPreco);
    if (!Number.isFinite(precoNum) || precoNum < 0) {
      toast.error("Preço unitário inválido");
      return;
    }
    // Código interno: timestamp + slug curto da descrição. Serve só pra
    // rastreio no banco; UI exibe "Composição própria" via format-codigo.
    const slug = desc
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
    const codigoInterno = `propria-${Date.now().toString(36)}-${slug || "item"}`;

    startAdd(async () => {
      const r = await addBudgetItemAction({
        budget_id: budgetId,
        codigo: codigoInterno,
        descricao: desc,
        unidade: propriaUnidade,
        quantidade: qtyNum,
        preco_unitario: precoNum,
        origem: "composicao_propria",
      });
      if (r.ok) {
        toast.success("Composição própria adicionada");
        setOpen(false);
        resetAll();
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            + Adicionar item
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar item ao orçamento</DialogTitle>
          <DialogDescription>
            Escolha entre buscar no catálogo SINAPI ou criar uma composição própria com seu preço de
            mercado.
          </DialogDescription>
        </DialogHeader>

        {/* Toggle de modo */}
        <div
          role="tablist"
          aria-label="Tipo de item"
          className="inline-flex w-fit gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <ModeButton
            active={mode === "sinapi"}
            onClick={() => setMode("sinapi")}
            icon={<Search className="h-3.5 w-3.5" />}
            label="Catálogo SINAPI"
          />
          <ModeButton
            active={mode === "propria"}
            onClick={() => setMode("propria")}
            icon={<PencilRuler className="h-3.5 w-3.5" />}
            label="Composição própria"
          />
        </div>

        {mode === "sinapi" ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Busca em SINAPI {uf} · {mesReferencia} ·{" "}
              {desonerado ? "desonerado" : "não-desonerado"}. Digite parte da descrição ou o código.
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="ex: alvenaria, piso cerâmico, 87878…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    doSearch();
                  }
                }}
              />
              <Button onClick={doSearch} disabled={searching}>
                {searching ? "Buscando…" : "Buscar"}
              </Button>
            </div>

            {results.length > 0 ? (
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-1">
                {results.map((r) => (
                  <button
                    key={r.codigo}
                    type="button"
                    onClick={() => setSelected(r)}
                    className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      selected?.codigo === r.codigo
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs text-zinc-500">{r.codigo}</code>
                      <span className="text-xs text-zinc-500">
                        {formatBRL(r.preco)} / {r.unidade}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm">{r.descricao}</p>
                  </button>
                ))}
              </div>
            ) : null}

            {selected ? (
              <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">Selecionado:</p>
                <p className="text-sm">
                  <code className="text-xs text-zinc-500">{selected.codigo}</code> —{" "}
                  {selected.descricao}
                </p>
                <div className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="qty">Quantidade ({selected.unidade})</Label>
                    <Input
                      id="qty"
                      type="number"
                      step="0.01"
                      min="0"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <p className="pb-1.5 text-sm text-zinc-500">
                    Preço unit.: {formatBRL(selected.preco)} · Total:{" "}
                    {formatBRL((Number(qty) || 0) * selected.preco)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Use quando o item não tem código SINAPI equivalente — ex: bancada de quartzo
              específica, esquadria sob medida, mão de obra especializada. Vai aparecer no PDF como
              &quot;Composição própria&quot;.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="propria-desc">Descrição *</Label>
              <Textarea
                id="propria-desc"
                value={propriaDesc}
                onChange={(e) => setPropriaDesc(e.target.value)}
                placeholder="Ex: Bancada de quartzo branco com cuba simples — fornecimento e instalação"
                rows={2}
                maxLength={500}
              />
              <p className="text-[11px] text-zinc-500">
                Seja específico: marca, modelo, dimensões — facilita cotação do fornecedor.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="propria-unidade">Unidade *</Label>
                <Select value={propriaUnidade} onValueChange={(v) => v && setPropriaUnidade(v)}>
                  <SelectTrigger id="propria-unidade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES_COMUNS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="propria-qty">Quantidade *</Label>
                <Input
                  id="propria-qty"
                  type="number"
                  step="0.01"
                  min="0"
                  value={propriaQty}
                  onChange={(e) => setPropriaQty(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="propria-preco">Preço unitário (R$) *</Label>
                <Input
                  id="propria-preco"
                  type="number"
                  step="0.01"
                  min="0"
                  value={propriaPreco}
                  onChange={(e) => setPropriaPreco(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            {Number(propriaQty) > 0 && Number(propriaPreco) > 0 ? (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500">Preview:</p>
                <p className="mt-0.5">
                  {Number(propriaQty).toFixed(2)} {propriaUnidade} ×{" "}
                  {formatBRL(Number(propriaPreco))} ={" "}
                  <span className="font-semibold">
                    {formatBRL(Number(propriaQty) * Number(propriaPreco))}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          {mode === "sinapi" ? (
            <Button onClick={doAddSinapi} disabled={!selected}>
              Adicionar
            </Button>
          ) : (
            <Button
              onClick={doAddPropria}
              disabled={!propriaDesc.trim() || !propriaQty || !propriaPreco}
            >
              Adicionar composição
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
