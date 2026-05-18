"use client";

import { useState, useTransition } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveDocumentAction } from "@/server/actions/documents/save.action";
import { toast } from "sonner";

type Props = {
  documentId: string;
  initialTitulo: string;
  initialContent: Record<string, unknown>;
  disabled?: boolean;
};

export function TiptapEditor({ documentId, initialTitulo, initialContent, disabled }: Props) {
  const [titulo, setTitulo] = useState(initialTitulo);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-zinc dark:prose-invert max-w-none min-h-[420px] rounded-md border border-zinc-200 bg-white p-4 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900",
      },
    },
    onUpdate: () => setDirty(true),
  });

  // Note: parent must pass `key={documentId}` so React remounts this component when
  // navigating between different documents — that re-initializes Tiptap from
  // initialContent without needing a useEffect that triggers the
  // set-state-in-effect lint rule.

  function onSave() {
    if (!editor) return;
    const json = editor.getJSON();
    startTransition(async () => {
      const result = await saveDocumentAction({
        document_id: documentId,
        titulo,
        conteudo_tiptap: json as Record<string, unknown>,
      });
      if (result.ok) {
        toast.success("Documento salvo");
        setDirty(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Input
          value={titulo}
          onChange={(e) => {
            setTitulo(e.target.value);
            setDirty(true);
          }}
          disabled={disabled || pending}
          className="text-xl font-semibold"
          placeholder="Título do documento"
        />
      </div>

      <Toolbar editor={editor} disabled={disabled || pending} />
      <EditorContent editor={editor} />

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          {dirty ? "Alterações não salvas." : "Sincronizado."}
        </p>
        <Button onClick={onSave} disabled={!editor || pending || !dirty}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  if (!editor) return null;
  const btnClass = (active: boolean) =>
    `rounded-md px-2 py-1 text-xs font-medium transition-colors ${
      active
        ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
        : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-1.5 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        disabled={disabled}
        className={btnClass(editor.isActive("heading", { level: 1 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </button>
      <button
        type="button"
        disabled={disabled}
        className={btnClass(editor.isActive("heading", { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </button>
      <button
        type="button"
        disabled={disabled}
        className={btnClass(editor.isActive("heading", { level: 3 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </button>
      <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
      <button
        type="button"
        disabled={disabled}
        className={btnClass(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </button>
      <button
        type="button"
        disabled={disabled}
        className={btnClass(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </button>
      <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
      <button
        type="button"
        disabled={disabled}
        className={btnClass(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • Lista
      </button>
      <button
        type="button"
        disabled={disabled}
        className={btnClass(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. Lista
      </button>
      <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
      <button
        type="button"
        disabled={disabled || !editor.can().undo()}
        className={btnClass(false)}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↶
      </button>
      <button
        type="button"
        disabled={disabled || !editor.can().redo()}
        className={btnClass(false)}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↷
      </button>
    </div>
  );
}
