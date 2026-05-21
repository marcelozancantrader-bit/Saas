import { Ruler } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { loadCubMatrix } from "@/server/services/admin-cub";
import { CubEditor } from "@/components/features/admin-shell/CubEditor";

export const dynamic = "force-dynamic";

export default async function CubAdminPage() {
  await requirePlatformAdmin();
  const matrix = await loadCubMatrix();

  const totalCells = Object.values(matrix.latest).reduce(
    (acc, row) => acc + Object.keys(row).length,
    0,
  );

  const latestMes = matrix.meses[0] ?? null;
  const ageDays = latestMes ? daysSince(latestMes) : null;

  return (
    <div className="space-y-6 text-zinc-100">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
          <Ruler className="h-6 w-6 text-amber-400" />
          CUB estadual
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Faixas de Custo Unitário Básico publicadas mensalmente pelo SINDUSCON de cada estado.
          Clique em qualquer célula pra editar.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Células preenchidas" value={`${totalCells} / 108`} />
        <StatCard label="UFs cobertas" value={`${matrix.ufs.length} / 27`} />
        <StatCard
          label="Mês mais recente"
          value={latestMes ? latestMes.slice(0, 7) : "—"}
          hint={
            ageDays !== null
              ? ageDays > 45
                ? `${ageDays} dias atrás — atualize`
                : `${ageDays} dias atrás`
              : null
          }
          warn={ageDays !== null && ageDays > 45}
        />
      </div>

      <CubEditor matrix={matrix} />
    </div>
  );
}

function daysSince(isoDate: string): number {
  return Math.floor((new Date().getTime() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

function StatCard({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string | null;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="text-[10px] tracking-wider text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-100">{value}</p>
      {hint ? (
        <p className={`mt-1 text-xs ${warn ? "text-amber-400" : "text-zinc-500"}`}>{hint}</p>
      ) : null}
    </div>
  );
}
