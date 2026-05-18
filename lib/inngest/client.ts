import { Inngest } from "inngest";
import type { Disciplina } from "@/lib/ai/prompts/_shared-extraction-schema";

/**
 * Inngest client for Memorial.ai.
 *
 * Events emitted (typed via TypeScript at the send/handler call sites since
 * Inngest v4 dropped the `EventSchemas` builder):
 *   - "project_file.uploaded": fired by registerUploadAction when tipo='planta_pdf'.
 *     data: { project_file_id, project_id, org_id, storage_path, mime_type, tipo, disciplina }
 */
export const inngest = new Inngest({ id: "memorial-ai" });

export type ProjectFileUploadedData = {
  project_file_id: string;
  project_id: string;
  org_id: string;
  storage_path: string;
  mime_type: string | null;
  tipo: "planta_pdf" | "dwg" | "imagem" | "doc_gerado" | "outro";
  disciplina: Disciplina;
};
