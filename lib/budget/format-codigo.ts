/**
 * Memorial.ai — Helper de formatação do código de composição exibido ao usuário.
 *
 * Itens com origem='custom' têm códigos internos como "custom-locacao-obra",
 * "custom-bancada-cozinha" etc — bons pra rastrear no banco mas péssimos
 * pra mostrar ao cliente final no PDF.
 *
 * Esta função traduz pra apresentação amigável:
 *   - Códigos SINAPI (numéricos): mantidos como estão
 *   - Códigos "custom-*": viram "Composição própria"
 *   - null/undefined: traço
 */
export function formatCodigoExibicao(
  codigo: string | null | undefined,
  origem?: "sinapi" | "custom" | "composicao_propria",
): string {
  if (!codigo) return "—";
  if (origem === "custom" || codigo.startsWith("custom-")) return "Composição própria";
  if (origem === "composicao_propria") return "Composição própria";
  return codigo;
}
