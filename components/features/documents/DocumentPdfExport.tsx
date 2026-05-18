"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { pdf, Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { tiptapToBlocks, type TiptapDocument } from "@/lib/tiptap/from-sections";
import { toast } from "sonner";

type Props = {
  filename: string;
  titulo: string;
  conteudoTiptap: Record<string, unknown>;
  status: "rascunho" | "aguardando_aprovacao" | "aprovado" | "recusado" | "arquivado";
  orgName: string;
  projectName: string;
  /** D4 branding: logo público da org (bucket org-logos) */
  logoUrl?: string | null;
  /** D4 branding: cor primária #hex da org (aplica em títulos + faixa) */
  corPrimaria?: string | null;
};

const DEFAULT_PRIMARY = "#1a1a1a";

function isValidHex(c: string | null | undefined): c is string {
  return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
}

function buildStyles(primary: string) {
  return StyleSheet.create({
    page: { padding: 48, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.5 },
    headerBar: {
      backgroundColor: primary,
      height: 4,
      marginLeft: -48,
      marginRight: -48,
      marginTop: -48,
      marginBottom: 24,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 18,
      borderBottom: "1pt solid #d4d4d8",
      paddingBottom: 12,
    },
    headerText: { flex: 1 },
    logo: { width: 56, height: 56, objectFit: "contain" },
    orgName: { fontSize: 13, fontWeight: 700, color: primary, marginBottom: 2 },
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
    h1: { fontSize: 18, fontWeight: 700, color: primary, marginTop: 12, marginBottom: 12 },
    h2: { fontSize: 14, fontWeight: 700, color: primary, marginTop: 14, marginBottom: 8 },
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
}

const DISCLAIMER =
  "Documento gerado com auxílio de inteligência artificial. Revise o conteúdo antes de utilizar. A responsabilidade técnica é do profissional emissor.";

export function DocumentPdfExport({
  filename,
  titulo,
  conteudoTiptap,
  status,
  orgName,
  projectName,
  logoUrl,
  corPrimaria,
}: Props) {
  const [pending, setPending] = useState(false);
  const primary = isValidHex(corPrimaria ?? null) ? corPrimaria! : DEFAULT_PRIMARY;
  const styles = buildStyles(primary);
  const showLogo = !!logoUrl && /^https?:\/\//.test(logoUrl);

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
            <View style={styles.headerBar} fixed />
            <View style={styles.header} fixed>
              {showLogo ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={logoUrl!} style={styles.logo} />
              ) : null}
              <View style={styles.headerText}>
                <Text style={styles.orgName}>{orgName}</Text>
                <Text style={styles.projectName}>Projeto: {projectName}</Text>
              </View>
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
