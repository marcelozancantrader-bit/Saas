import { Badge } from "@/components/ui/badge";

export type ExtractionStatus = "pendente" | "processando" | "concluida" | "erro" | null | undefined;

const LABEL: Record<NonNullable<ExtractionStatus>, string> = {
  pendente: "Na fila",
  processando: "Processando IA…",
  concluida: "Extraído",
  erro: "Erro na extração",
};

const VARIANT: Record<
  NonNullable<ExtractionStatus>,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pendente: "outline",
  processando: "secondary",
  concluida: "default",
  erro: "destructive",
};

type Props = { status: ExtractionStatus };

export function ExtractionStatusBadge({ status }: Props) {
  if (!status) return null;
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
