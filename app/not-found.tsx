import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

export const metadata = {
  title: "Página não encontrada",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center dark:bg-zinc-950">
      <Link href="/" aria-label="Memorial.ai" className="inline-flex items-center gap-2">
        <Logo size={28} />
        <span className="text-base font-semibold">Memorial.ai</span>
      </Link>
      <p className="mt-12 text-7xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
        404
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Página não encontrada</h1>
      <p className="mx-auto mt-3 max-w-md text-base text-zinc-600 dark:text-zinc-400">
        O link pode estar quebrado ou a página foi removida. Que tal voltar para a página inicial ou
        abrir o dashboard?
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          Voltar para o início
        </Link>
        <Link href="/dashboard" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Abrir o dashboard
        </Link>
      </div>
    </main>
  );
}
