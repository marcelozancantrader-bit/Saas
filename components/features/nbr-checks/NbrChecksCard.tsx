import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { runNbrChecks, type ExtractionForCheck, type NbrFinding } from "@/lib/nbr-checks";

type Props = { extracao: ExtractionForCheck };

const SEVERITY_LABEL: Record<NbrFinding["severity"], string> = {
  ok: "OK",
  warn: "Verificar",
  issue: "Atenção",
};

const SEVERITY_VARIANT: Record<NbrFinding["severity"], "default" | "secondary" | "destructive"> = {
  ok: "default",
  warn: "secondary",
  issue: "destructive",
};

export function NbrChecksCard({ extracao }: Props) {
  const findings = runNbrChecks(extracao);
  if (findings.length === 0) return null;

  const issues = findings.filter((f) => f.severity === "issue").length;
  const warns = findings.filter((f) => f.severity === "warn").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Análise NBR (preliminar)</CardTitle>
          <div className="flex gap-2 text-xs">
            {issues > 0 ? <Badge variant="destructive">{issues} pontos críticos</Badge> : null}
            {warns > 0 ? <Badge variant="secondary">{warns} verificações</Badge> : null}
          </div>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Avaliação automática baseada na extração da planta. NÃO substitui análise técnica do
          profissional. Cruzar com o projeto executivo antes de aprovar.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {findings.map((f) => (
            <li
              key={f.id}
              className="flex items-start gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <Badge variant={SEVERITY_VARIANT[f.severity]} className="shrink-0">
                {SEVERITY_LABEL[f.severity]}
              </Badge>
              <div className="min-w-0">
                <p className="font-medium">{f.rule}</p>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">{f.message}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Referência: <em>{f.reference}</em>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
