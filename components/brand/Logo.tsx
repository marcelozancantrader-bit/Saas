import { cn } from "@/lib/utils";

type Props = {
  /** Tamanho do ícone em px (a fonte do wordmark escala junto). */
  size?: number;
  /** Se true, mostra só o ícone (sem texto). */
  iconOnly?: boolean;
  className?: string;
};

/**
 * Marca Memorial.ai — ícone (M arquitetônico em azul) + wordmark.
 *
 * O ".ai" sempre vem em azul brand (text-primary) para reforçar a identidade
 * visual em qualquer contexto: sidebar, landing, e-mails, PDFs.
 */
export function Logo({ size = 24, iconOnly = false, className }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden={iconOnly ? undefined : true}
        role={iconOnly ? "img" : undefined}
        aria-label={iconOnly ? "Memorial.ai" : undefined}
      >
        <rect width="32" height="32" rx="7" className="fill-primary" />
        <path
          d="M7 24 L7 9 L12 17 L16 11 L20 17 L25 9 L25 24"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="25" cy="24" r="1.6" fill="#60A5FA" />
      </svg>
      {iconOnly ? null : (
        <span
          className="font-semibold tracking-tight"
          style={{ fontSize: Math.round(size * 0.72) }}
        >
          Memorial<span className="text-primary">.ai</span>
        </span>
      )}
    </span>
  );
}
