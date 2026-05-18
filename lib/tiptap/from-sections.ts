import type { GeneratedDocument } from "@/lib/ai/prompts/_shared-document-schema";

/**
 * Converte o output estruturado da IA (titulo + sections) para Tiptap JSON.
 * O Tiptap doc usa StarterKit (heading, paragraph, bulletList, orderedList, listItem).
 *
 * Formato:
 * {
 *   type: "doc",
 *   content: [
 *     { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Título" }] },
 *     { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Seção" }] },
 *     { type: "paragraph", content: [{ type: "text", text: "..." }] },
 *     { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "..." }] }] }] }
 *   ]
 * }
 */

// We type loosely as Record<string, unknown> to avoid a hard dep on @tiptap/core types
// (this is also what gets stored as jsonb in the database).
export type TiptapNode = Record<string, unknown>;

export type TiptapDocument = {
  type: "doc";
  content: TiptapNode[];
};

function textNode(text: string): TiptapNode {
  return { type: "text", text };
}

function paragraph(text: string): TiptapNode {
  return { type: "paragraph", content: [textNode(text)] };
}

function heading(level: 1 | 2 | 3, text: string): TiptapNode {
  return { type: "heading", attrs: { level }, content: [textNode(text)] };
}

function listItem(text: string): TiptapNode {
  return {
    type: "listItem",
    content: [{ type: "paragraph", content: [textNode(text)] }],
  };
}

function bulletList(items: string[]): TiptapNode {
  return { type: "bulletList", content: items.map(listItem) };
}

function orderedList(items: string[]): TiptapNode {
  return { type: "orderedList", content: items.map(listItem) };
}

export function documentToTiptap(doc: GeneratedDocument): TiptapDocument {
  const content: TiptapNode[] = [];

  // H1 — Título
  content.push(heading(1, doc.titulo));

  for (const section of doc.sections) {
    // H2 — Seção
    content.push(heading(2, section.heading));

    // Blocos da seção
    for (const block of section.content) {
      switch (block.type) {
        case "paragraph":
          content.push(paragraph(block.text));
          break;
        case "subheading":
          content.push(heading(3, block.text));
          break;
        case "bullet_list":
          content.push(bulletList(block.items));
          break;
        case "ordered_list":
          content.push(orderedList(block.items));
          break;
      }
    }
  }

  return { type: "doc", content };
}

/**
 * Walks the Tiptap document and yields plain text/structure blocks for PDF or
 * any non-React renderer. Each block is one of: heading(level, text),
 * paragraph(text), bullet(items), ordered(items).
 */
export type FlatBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; items: string[] }
  | { kind: "ordered"; items: string[] };

function getNodeText(node: TiptapNode): string {
  const content = node.content as TiptapNode[] | undefined;
  if (!Array.isArray(content)) return "";
  return content
    .map((n) => {
      if (n.type === "text" && typeof n.text === "string") return n.text;
      return getNodeText(n);
    })
    .join("");
}

function getListItemText(item: TiptapNode): string {
  const content = item.content as TiptapNode[] | undefined;
  if (!Array.isArray(content)) return "";
  return content.map((n) => getNodeText(n)).join(" ");
}

export function tiptapToBlocks(doc: TiptapDocument | TiptapNode): FlatBlock[] {
  const blocks: FlatBlock[] = [];
  const root = doc as TiptapNode;
  const children = (root.content as TiptapNode[] | undefined) ?? [];
  for (const node of children) {
    switch (node.type) {
      case "heading": {
        const attrs = (node.attrs as { level?: number } | undefined) ?? {};
        const level = (attrs.level ?? 2) as 1 | 2 | 3;
        blocks.push({ kind: "heading", level, text: getNodeText(node) });
        break;
      }
      case "paragraph": {
        const text = getNodeText(node);
        if (text.trim()) blocks.push({ kind: "paragraph", text });
        break;
      }
      case "bulletList": {
        const items = ((node.content as TiptapNode[] | undefined) ?? []).map(getListItemText);
        blocks.push({ kind: "bullet", items });
        break;
      }
      case "orderedList": {
        const items = ((node.content as TiptapNode[] | undefined) ?? []).map(getListItemText);
        blocks.push({ kind: "ordered", items });
        break;
      }
      default:
        // skip unknown nodes
        break;
    }
  }
  return blocks;
}
