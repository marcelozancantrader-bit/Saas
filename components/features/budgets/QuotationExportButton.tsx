"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { pdf, Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { BudgetItem } from "@/app/(app)/projetos/[id]/orcamento/[budgetId]/page";
import { formatBRL } from "@/lib/utils/money";
import { formatCodigoExibicao } from "@/lib/budget/format-codigo";
import {
  classifyFamilia,
  FAMILIA_LABEL,
  FAMILIA_ORDER,
  type Familia,
} from "@/lib/budget/family-classifier";
import { FileDown, Send } from "lucide-react";
import { toast } from "sonner";

type Props = {
  items: BudgetItem[];
  projectName: string;
  budgetVersao: number;
  orgName: string;
  profissional: {
    nome: string | null;
    cau_crea: string | null;
  };
};

type Grupo = { familia: Familia; itens: BudgetItem[] };

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Helvetica", fontSize: 9 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 14 },
  intro: {
    fontSize: 9,
    color: "#333",
    marginBottom: 16,
    lineHeight: 1.4,
  },
  familiaHeader: {
    backgroundColor: "#1d4ed8",
    color: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 10,
    fontWeight: 700,
    marginTop: 10,
  },
  trHead: {
    flexDirection: "row",
    backgroundColor: "#f4f4f5",
    paddingVertical: 5,
    fontWeight: 700,
  },
  tr: { flexDirection: "row", borderBottom: "0.5pt solid #eee", paddingVertical: 4 },
  td: { paddingHorizontal: 4 },
  colCodigo: { width: "14%" },
  colDescricao: { width: "48%" },
  colUn: { width: "8%" },
  colQty: { width: "10%", textAlign: "right" },
  colPreco: {
    width: "20%",
    textAlign: "right",
    borderLeft: "1pt dashed #999",
    paddingLeft: 6,
  },
  precoPlaceholder: { color: "#bbb", fontStyle: "italic" },
  obs: {
    marginTop: 24,
    fontSize: 8,
    color: "#444",
    padding: 10,
    backgroundColor: "#fef3c7",
    borderLeft: "3pt solid #d97706",
  },
  signature: {
    marginTop: 28,
    fontSize: 9,
    color: "#444",
    borderTop: "0.5pt solid #ccc",
    paddingTop: 8,
  },
});

export function QuotationExportButton({
  items,
  projectName,
  budgetVersao,
  orgName,
  profissional,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  // Agrupa itens por família, na ordem canônica.
  const grupos = useMemo<Grupo[]>(() => {
    const byFamilia = new Map<Familia, BudgetItem[]>();
    for (const it of items) {
      const fam = classifyFamilia({
        descricao: it.descricao,
        disciplina: it.disciplina,
      });
      const arr = byFamilia.get(fam) ?? [];
      arr.push(it);
      byFamilia.set(fam, arr);
    }
    return FAMILIA_ORDER.filter((f) => byFamilia.has(f)).map((f) => ({
      familia: f,
      itens: byFamilia.get(f)!,
    }));
  }, [items]);

  const totalItens = items.length;
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeFilename(base: string): string {
    return base
      .replace(/[^a-zA-Z0-9\-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }

  async function exportPdf() {
    setPending(true);
    try {
      const doc = (
        <Document>
          <Page size="A4" style={styles.page} wrap>
            <Text style={styles.title}>Pedido de cotação — {projectName}</Text>
            <Text style={styles.subtitle}>
              {orgName} · Orçamento v{budgetVersao} · Emitido em {dataHoje}
            </Text>

            <Text style={styles.intro}>
              Prezado(a) fornecedor(a), solicitamos cotação para os itens listados abaixo, agrupados
              por família. Por favor, preencha a coluna &quot;Preço unitário&quot; com o valor que
              pratica e devolva por e-mail ou WhatsApp. As quantidades são referenciais — podem ser
              ajustadas após confirmação técnica em obra.
            </Text>

            {grupos.map((g) => (
              <View key={g.familia} wrap={false}>
                <Text style={styles.familiaHeader}>{FAMILIA_LABEL[g.familia]}</Text>
                <View style={styles.trHead}>
                  <Text style={[styles.td, styles.colCodigo]}>Código</Text>
                  <Text style={[styles.td, styles.colDescricao]}>Descrição</Text>
                  <Text style={[styles.td, styles.colUn]}>Un.</Text>
                  <Text style={[styles.td, styles.colQty]}>Qtd</Text>
                  <Text style={[styles.td, styles.colPreco]}>Preço un. (R$)</Text>
                </View>
                {g.itens.map((it) => (
                  <View key={it.id} style={styles.tr}>
                    <Text style={[styles.td, styles.colCodigo]}>
                      {formatCodigoExibicao(it.composicao_codigo, it.origem)}
                    </Text>
                    <Text style={[styles.td, styles.colDescricao]}>{it.descricao}</Text>
                    <Text style={[styles.td, styles.colUn]}>{it.unidade}</Text>
                    <Text style={[styles.td, styles.colQty]}>
                      {Number(it.quantidade).toFixed(2)}
                    </Text>
                    <Text style={[styles.td, styles.colPreco, styles.precoPlaceholder]}>
                      ________
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            <Text style={styles.obs}>
              Importante: informe (1) prazo de entrega após confirmação do pedido, (2) condições de
              pagamento, (3) se o preço inclui frete e impostos, (4) validade da cotação. Em caso de
              dúvida sobre as especificações, entre em contato pelo canal informado abaixo.
            </Text>

            <Text style={styles.signature}>
              Solicitante:{"\n"}
              {profissional.nome ?? "[Profissional responsável]"}
              {profissional.cau_crea ? ` · ${profissional.cau_crea}` : ""}
              {"\n"}
              {orgName}
            </Text>
          </Page>
        </Document>
      );
      const blob = await pdf(doc).toBlob();
      downloadBlob(`cotacao-${safeFilename(projectName)}-v${budgetVersao}.pdf`, blob);
      toast.success("Pedido de cotação exportado em PDF");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar PDF");
    } finally {
      setPending(false);
    }
  }

  function exportCsv() {
    setPending(true);
    try {
      const rows: Array<{
        Familia: string;
        Codigo: string;
        Descricao: string;
        Unidade: string;
        Quantidade: number;
        "Preco unitario (BRL)": string;
        "Subtotal (BRL)": string;
      }> = [];
      for (const g of grupos) {
        for (const it of g.itens) {
          rows.push({
            Familia: FAMILIA_LABEL[g.familia],
            Codigo: formatCodigoExibicao(it.composicao_codigo, it.origem),
            Descricao: it.descricao,
            Unidade: it.unidade,
            Quantidade: Number(it.quantidade),
            "Preco unitario (BRL)": "",
            "Subtotal (BRL)": "",
          });
        }
      }
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = [
        { wch: 28 },
        { wch: 12 },
        { wch: 48 },
        { wch: 8 },
        { wch: 10 },
        { wch: 18 },
        { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Pedido de cotação");
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      downloadBlob(`cotacao-${safeFilename(projectName)}-v${budgetVersao}.xlsx`, blob);
      toast.success("Pedido de cotação exportado em Excel");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar Excel");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Send className="mr-1.5 h-3.5 w-3.5" />
        Pedido de cotação
      </Button>

      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Gerar pedido de cotação
            </DialogTitle>
            <DialogDescription>
              Os {totalItens} itens do orçamento são agrupados por família. O fornecedor preenche a
              coluna &quot;Preço unitário&quot; e devolve. Versão impressa (PDF) ou planilha (XLSX).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Famílias detectadas
            </p>
            <ul className="space-y-0.5 text-xs">
              {grupos.map((g) => (
                <li key={g.familia} className="flex justify-between gap-2">
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {FAMILIA_LABEL[g.familia]}
                  </span>
                  <span className="text-zinc-500 tabular-nums">
                    {g.itens.length} {g.itens.length === 1 ? "item" : "itens"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-zinc-200 pt-1.5 text-[11px] text-zinc-500 italic dark:border-zinc-800">
              Classificação automática por palavras-chave da descrição SINAPI. Itens não
              reconhecidos vão pra &quot;Diversos&quot;.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={pending}>
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              Baixar XLSX
            </Button>
            <Button onClick={exportPdf} disabled={pending}>
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              {pending ? "Gerando…" : "Baixar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
