"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { pdf, Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { BudgetItem } from "@/app/(app)/projetos/[id]/orcamento/[budgetId]/page";
import { formatBRL } from "@/lib/utils/money";
import { toast } from "sonner";

type Budget = {
  id: string;
  versao: number;
  uf: string;
  mes_referencia: string;
  desonerado: boolean;
  bdi_pct: string;
  total_bruto: string;
  total_com_bdi: string;
};

type Props = { budget: Budget; items: BudgetItem[]; projectName: string };

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Helvetica", fontSize: 9 },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 16 },
  table: { width: "100%", borderTop: "1pt solid #ccc" },
  tr: { flexDirection: "row", borderBottom: "1pt solid #eee", paddingVertical: 4 },
  trHead: { flexDirection: "row", backgroundColor: "#f5f5f5", paddingVertical: 6, fontWeight: 700 },
  td: { paddingHorizontal: 4 },
  colOrdem: { width: "5%" },
  colCodigo: { width: "10%" },
  colDescricao: { width: "45%" },
  colUn: { width: "7%" },
  colQty: { width: "9%", textAlign: "right" },
  colPreco: { width: "12%", textAlign: "right" },
  colTotal: { width: "12%", textAlign: "right" },
  totals: { marginTop: 16, borderTop: "1pt solid #999", paddingTop: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  totalLabel: { fontWeight: 700 },
  disclaimer: {
    marginTop: 24,
    fontSize: 7,
    color: "#888",
    fontStyle: "italic",
    borderTop: "1pt solid #eee",
    paddingTop: 8,
  },
});

export function ExportButtons({ budget, items, projectName }: Props) {
  const [pending, setPending] = useState(false);

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

  function exportExcel() {
    setPending(true);
    try {
      const data = items.map((item) => ({
        Ordem: item.ordem,
        "Código SINAPI": item.composicao_codigo ?? "",
        Descrição: item.descricao,
        Unidade: item.unidade,
        Quantidade: Number(item.quantidade),
        "Preço unitário": Number(item.preco_unitario),
        Total: Number(item.total),
      }));
      const totalBruto = Number(budget.total_bruto);
      const bdi = Number(budget.bdi_pct);
      const totalBdi = Number(budget.total_com_bdi);

      const sheet = XLSX.utils.json_to_sheet(data);
      // Column widths
      sheet["!cols"] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 50 },
        { wch: 8 },
        { wch: 10 },
        { wch: 14 },
        { wch: 14 },
      ];
      // Append totals
      const startRow = data.length + 2;
      XLSX.utils.sheet_add_aoa(
        sheet,
        [
          ["", "", "", "", "", "Total bruto", totalBruto],
          ["", "", "", "", "", `BDI (${bdi.toFixed(2)}%)`, totalBdi - totalBruto],
          ["", "", "", "", "", "TOTAL COM BDI", totalBdi],
        ],
        { origin: `A${startRow}` },
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, `Orçamento v${budget.versao}`);
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      downloadBlob(`orcamento-${projectName.replace(/\s+/g, "-")}-v${budget.versao}.xlsx`, blob);
      toast.success("Excel exportado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar Excel");
    } finally {
      setPending(false);
    }
  }

  async function exportPDF() {
    setPending(true);
    try {
      const doc = (
        <Document>
          <Page size="A4" style={styles.page} wrap>
            <Text style={styles.title}>Orçamento — {projectName}</Text>
            <Text style={styles.subtitle}>
              Versão {budget.versao} · {budget.uf} · ref. {budget.mes_referencia} ·{" "}
              {budget.desonerado ? "desonerado" : "não-desonerado"} · BDI{" "}
              {Number(budget.bdi_pct).toFixed(2)}%
            </Text>

            <View style={styles.table}>
              <View style={styles.trHead}>
                <Text style={[styles.td, styles.colOrdem]}>#</Text>
                <Text style={[styles.td, styles.colCodigo]}>Código</Text>
                <Text style={[styles.td, styles.colDescricao]}>Descrição</Text>
                <Text style={[styles.td, styles.colUn]}>Un.</Text>
                <Text style={[styles.td, styles.colQty]}>Qty</Text>
                <Text style={[styles.td, styles.colPreco]}>Preço un.</Text>
                <Text style={[styles.td, styles.colTotal]}>Total</Text>
              </View>
              {items.map((item) => (
                <View key={item.id} style={styles.tr}>
                  <Text style={[styles.td, styles.colOrdem]}>{item.ordem}</Text>
                  <Text style={[styles.td, styles.colCodigo]}>{item.composicao_codigo ?? "—"}</Text>
                  <Text style={[styles.td, styles.colDescricao]}>{item.descricao}</Text>
                  <Text style={[styles.td, styles.colUn]}>{item.unidade}</Text>
                  <Text style={[styles.td, styles.colQty]}>
                    {Number(item.quantidade).toFixed(2)}
                  </Text>
                  <Text style={[styles.td, styles.colPreco]}>{formatBRL(item.preco_unitario)}</Text>
                  <Text style={[styles.td, styles.colTotal]}>{formatBRL(item.total)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.totals}>
              <View style={styles.totalRow}>
                <Text>Total bruto</Text>
                <Text>{formatBRL(budget.total_bruto)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>BDI ({Number(budget.bdi_pct).toFixed(2)}%)</Text>
                <Text>{formatBRL(Number(budget.total_com_bdi) - Number(budget.total_bruto))}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL COM BDI</Text>
                <Text style={styles.totalLabel}>{formatBRL(budget.total_com_bdi)}</Text>
              </View>
            </View>

            <Text style={styles.disclaimer}>
              Documento gerado com auxílio de inteligência artificial (extração de planta) e regras
              heurísticas (Memorial.ai, regras v1) a partir de preços SINAPI. Revise o conteúdo
              antes de utilizar. A responsabilidade técnica é do profissional emissor.
            </Text>
          </Page>
        </Document>
      );
      const blob = await pdf(doc).toBlob();
      downloadBlob(`orcamento-${projectName.replace(/\s+/g, "-")}-v${budget.versao}.pdf`, blob);
      toast.success("PDF exportado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar PDF");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportExcel} disabled={pending}>
        Exportar Excel
      </Button>
      <Button variant="outline" size="sm" onClick={exportPDF} disabled={pending}>
        Exportar PDF
      </Button>
    </div>
  );
}
