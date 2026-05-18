"use client";

import { useState } from "react";
import { pdf, Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ATIVIDADE_TIPO_LABEL, TIPO_LABEL, type ArtRrtData } from "@/lib/art-rrt/fields";

type Props = {
  data: ArtRrtData;
  filename: string;
};

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.4 },
  header: { borderBottom: "2pt solid #111", paddingBottom: 12, marginBottom: 18 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#555" },
  warn: {
    backgroundColor: "#fff7e6",
    border: "1pt solid #f59e0b",
    padding: 8,
    fontSize: 8,
    marginBottom: 16,
    color: "#7c2d12",
  },
  block: { marginBottom: 14 },
  blockTitle: {
    fontSize: 11,
    fontWeight: 700,
    backgroundColor: "#f4f4f5",
    padding: 5,
    marginBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 130, color: "#555", fontSize: 9 },
  value: { flex: 1, fontSize: 9 },
  divider: { borderBottom: "1pt dashed #e4e4e7", marginVertical: 12 },
  signature: { marginTop: 36, borderTop: "1pt solid #111", paddingTop: 4, fontSize: 9 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#888",
    textAlign: "center",
  },
});

function brl(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function date(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
}

export function ArtRrtExport({ data, filename }: Props) {
  const [pending, setPending] = useState(false);

  async function onExport() {
    setPending(true);
    try {
      const doc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {data.tipo === "art" ? "Resumo de ART" : "Resumo de RRT"} — pré-preenchimento
              </Text>
              <Text style={styles.subtitle}>{TIPO_LABEL[data.tipo]}</Text>
            </View>

            <View style={styles.warn}>
              <Text>
                AVISO: este documento é apenas um RESUMO para acelerar o preenchimento no sistema
                oficial ({data.tipo === "art" ? "SISCREA" : "SISCAU"}). Não substitui a ART/RRT
                oficial. A responsabilidade técnica só vigora após o registro e pagamento da taxa no
                órgão competente.
              </Text>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>1. Profissional responsável</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Nome</Text>
                <Text style={styles.value}>{data.profissional_nome || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Registro {data.tipo === "art" ? "CREA" : "CAU"}</Text>
                <Text style={styles.value}>{data.profissional_registro || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>CPF</Text>
                <Text style={styles.value}>{data.profissional_cpf || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>E-mail</Text>
                <Text style={styles.value}>{data.profissional_email || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Endereço</Text>
                <Text style={styles.value}>{data.profissional_endereco || "—"}</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>2. Empresa contratada (se aplicável)</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Razão social</Text>
                <Text style={styles.value}>{data.org_nome || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>CNPJ</Text>
                <Text style={styles.value}>{data.org_cnpj || "—"}</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>3. Contratante</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Nome</Text>
                <Text style={styles.value}>{data.contratante_nome || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>CPF/CNPJ</Text>
                <Text style={styles.value}>{data.contratante_cpf_cnpj || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Endereço</Text>
                <Text style={styles.value}>{data.contratante_endereco || "—"}</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>4. Dados da obra</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Endereço</Text>
                <Text style={styles.value}>{data.obra_endereco_completo || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Cidade/UF</Text>
                <Text style={styles.value}>{data.obra_cidade_uf || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Tipologia</Text>
                <Text style={styles.value}>{data.obra_tipologia || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Padrão</Text>
                <Text style={styles.value}>{data.obra_padrao || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Área (m²)</Text>
                <Text style={styles.value}>
                  {data.obra_area_m2 !== null ? data.obra_area_m2.toString() : "—"}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Pavimentos</Text>
                <Text style={styles.value}>
                  {data.obra_pavimentos !== null ? data.obra_pavimentos.toString() : "—"}
                </Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>5. Atividade técnica</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Tipo</Text>
                <Text style={styles.value}>{ATIVIDADE_TIPO_LABEL[data.atividade_tipo]}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Descrição</Text>
                <Text style={styles.value}>{data.atividade_descricao || "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Início</Text>
                <Text style={styles.value}>{date(data.data_inicio)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Previsão término</Text>
                <Text style={styles.value}>{date(data.data_previsao_termino)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Valor do contrato</Text>
                <Text style={styles.value}>{brl(data.valor_contrato_brl)}</Text>
              </View>
            </View>

            <View style={styles.signature}>
              <Text>
                {data.profissional_nome || "Profissional responsável"} —{" "}
                {data.tipo === "art" ? "CREA" : "CAU"} {data.profissional_registro || ""}
              </Text>
              <Text style={{ fontSize: 8, color: "#666", marginTop: 2 }}>
                Assinatura física no documento oficial registrado em{" "}
                {data.tipo === "art" ? "SISCREA" : "SISCAU"}.
              </Text>
            </View>

            <Text style={styles.footer}>
              Gerado em {new Date().toLocaleString("pt-BR")} — Memorial.ai · Pré-preenchimento não
              substitui o registro oficial.
            </Text>
          </Page>
        </Document>
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`${data.tipo.toUpperCase()} pré-preenchida gerada`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar PDF");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={onExport} disabled={pending} size="sm" variant="outline">
      {pending ? "Gerando…" : `Baixar pré-${data.tipo.toUpperCase()}`}
    </Button>
  );
}
