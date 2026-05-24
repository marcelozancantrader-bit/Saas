/**
 * Diff estatístico entre duas versões de documento Tiptap.
 *
 * Compara contagens (chars, words, sections H2) — não faz diff textual
 * linha-a-linha. Suficiente pra mostrar "vs v1: +320 chars em 2 sections
 * novas" no topo do editor.
 */

type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: { level?: number };
  content?: TiptapNode[];
};

type TiptapDoc = {
  type?: string;
  content?: TiptapNode[];
};

export type DocStats = {
  chars: number;
  words: number;
  sectionTitles: string[]; // títulos H2 (level=2)
};

export type DocDiff = {
  charsDelta: number;
  wordsDelta: number;
  sectionsAdded: string[];
  sectionsRemoved: string[];
  /** Total sections atuais — usado pra exibir "X de Y sections novas". */
  sectionsTotal: number;
};

function walkText(node: TiptapNode): string {
  let out = node.text ?? "";
  if (node.content) {
    for (const child of node.content) out += walkText(child);
  }
  return out;
}

function collectSections(doc: TiptapDoc): string[] {
  const titles: string[] = [];
  const visit = (n: TiptapNode) => {
    if (n.type === "heading" && n.attrs?.level === 2) {
      const text = walkText(n).trim();
      if (text) titles.push(text);
    }
    if (n.content) n.content.forEach(visit);
  };
  if (doc.content) doc.content.forEach(visit);
  return titles;
}

export function computeStats(content: Record<string, unknown> | null | undefined): DocStats {
  if (!content) return { chars: 0, words: 0, sectionTitles: [] };
  const doc = content as TiptapDoc;
  const text = (doc.content ?? []).map(walkText).join("\n");
  const words = text.trim().length > 0 ? text.trim().split(/\s+/).length : 0;
  return {
    chars: text.length,
    words,
    sectionTitles: collectSections(doc),
  };
}

export function diffStats(
  previous: Record<string, unknown> | null | undefined,
  current: Record<string, unknown> | null | undefined,
): DocDiff {
  const prev = computeStats(previous);
  const curr = computeStats(current);

  const prevSet = new Set(prev.sectionTitles.map((s) => s.toLowerCase()));
  const currSet = new Set(curr.sectionTitles.map((s) => s.toLowerCase()));

  const sectionsAdded = curr.sectionTitles.filter((s) => !prevSet.has(s.toLowerCase()));
  const sectionsRemoved = prev.sectionTitles.filter((s) => !currSet.has(s.toLowerCase()));

  return {
    charsDelta: curr.chars - prev.chars,
    wordsDelta: curr.words - prev.words,
    sectionsAdded,
    sectionsRemoved,
    sectionsTotal: curr.sectionTitles.length,
  };
}
