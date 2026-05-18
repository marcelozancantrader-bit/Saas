"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { pdf, Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { tiptapToBlocks, type TiptapDocument } from "@/lib/tiptap/from-sections";
import { toast } from "sonner";

type Props = {
  filename: string;
  titulo: string;
  conteudoTiptap: Record<string, unknown>;
  status: "rascunho" | "aguardando_aprovacao" | "aprovado" | "recusado" | "arquivado";
  orgName: string;
  projectName: string;
};

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.5 },
  header: { marginBottom: 16, borderBottom: "1pt solid #d4d4d8", paddingBottom: 10 },
  orgName: { fontSize: 9, color: "#6b7280", marginBottom: 4 },
  projectName: { fontSize: 9, color: "#6b7280" },
  watermark: {
    position: "absolute",
    top: "40%",
    left: "10%",
    right: "10%",
    fontSize: 96,
    color: "#e5e7eb",
    textAlign: "center",
    fontWeight: 700,
    opacity: 0.5,
  },
  h1: { fontSize: 18, fontWeight: 700, marginTop: 12, marginBottom: 12 },
  h2: { fontSize: 14, fontWeight: 700, marginTop: 14, marginBottom: 8 },
  h3: { fontSize: 12, fontWeight: 700, marginTop: 10, marginBottom: 6 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  listItem: { marginBottom: 4, marginLeft: 12, flexDirection: "row" },
  bullet: { width: 12 },
  itemText: { flex: 1 },
  disclaimer: {
    marginTop: 28,
    fontSize: 8,
    color: "#6b7280",
    fontStyle: "italic",
    borderTop: "1pt solid #e5e7eb",
    paddingTop: 8,
    textAlign: "justify",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
    borderTop: "1pt solid #f3f4f6",
    paddingTop: 6,
  },
});

const DISCLAIMER =
  "Documento gerado com auxílio de inteligência artificial. Revise o conteúdo antes de utilizar. A responsabilidade técnica é do profissional emissor.";

export function DocumentPdfExport({
  filename,
  titulo,
  conteudoTiptap,
  status,
  orgName,
  projectName,
}: Props) {
  const [pending, setPending] = useState(false);

  function downloadBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function onExport() {
    setPending(true);
    try {
      const blocks = tiptapToBlocks(conteudoTiptap as TiptapDocument);
      const showRascunho = status === "rascunho";

      const doc = (
        <Document>
          <Page size="A4" style={styles.page} wrap>
            <View style={styles.header} fixed>
              <Text style={styles.orgName}>{orgName}</Text>
              <Text style={styles.projectName}>Projeto: {projectName}</Text>
            </View>

            {showRascunho ? (
              <Text style={styles.watermark} fixed>
                RASCUNHO
              </Text>
            ) : null}

            <Text style={styles.h1}>{titulo}</Text>

            {blocks.map((b, i) => {
              if (b.kind === "heading") {
                const style = b.level === 1 ? styles.h1 : b.level === 2 ? styles.h2 : styles.h3;
                return (
                  <Text key={i} style={style}>
                    {b.text}
                  </Text>
                );
              }
              if (b.kind === "paragraph") {
                return (
                  <Text key={i} style={styles.paragraph}>
                    {b.text}
                  </Text>
                );
              }
              if (b.kind === "bullet") {
                return (
                  <View key={i} wrap={false}>
                    {b.items.map((item, j) => (
                      <View key={j} style={styles.listItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.itemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                );
              }
              if (b.kind === "ordered") {
                return (
                  <View key={i} wrap={false}>
                    {b.items.map((item, j) => (
                      <View key={j} style={styles.listItem}>
                        <Text style={styles.bullet}>{j + 1}.</Text>
                        <Text style={styles.itemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                );
              }
              return null;
            })}

            <Text style={styles.disclaimer}>{DISCLAIMER}</Text>

            <Text
              style={styles.footer}
              fixed
              render={({ pageNumber, totalPages }) =>
                `${orgName}  ·  ${titulo}  ·  Página ${pageNumber} de ${totalPages}`
              }
            />
          </Page>
        </Document>
      );

      const blob = await pdf(doc).toBlob();
      downloadBlob(blob);
      toast.success("PDF exportado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar PDF");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={onExport} disabled={pending}>
      {pending ? "Gerando…" : "Exportar PDF"}
    </Button>
  );
}
