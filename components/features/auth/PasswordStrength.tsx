"use client";

import { useMemo } from "react";

type Score = 0 | 1 | 2 | 3 | 4;

const LEVELS: Array<{ label: string; color: string; textColor: string }> = [
  { label: "Muito fraca", color: "bg-red-500", textColor: "text-red-700 dark:text-red-400" },
  { label: "Fraca", color: "bg-orange-500", textColor: "text-orange-700 dark:text-orange-400" },
  { label: "Regular", color: "bg-amber-500", textColor: "text-amber-700 dark:text-amber-400" },
  { label: "Boa", color: "bg-lime-500", textColor: "text-lime-700 dark:text-lime-400" },
  { label: "Forte", color: "bg-green-600", textColor: "text-green-700 dark:text-green-400" },
];

function calculate(password: string): Score {
  if (password.length < 8) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4) as Score;
}

type Props = {
  password: string;
};

export function PasswordStrength({ password }: Props) {
  const score = useMemo(() => calculate(password), [password]);
  const level = LEVELS[score]!;
  const filledBars = score + 1;

  if (!password) return null;

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={[
              "h-1 flex-1 rounded-full transition-colors",
              i < filledBars ? level.color : "bg-zinc-200 dark:bg-zinc-800",
            ].join(" ")}
          />
        ))}
      </div>
      <p className={["text-xs font-medium", level.textColor].join(" ")}>
        Força da senha: {level.label}
      </p>
    </div>
  );
}
