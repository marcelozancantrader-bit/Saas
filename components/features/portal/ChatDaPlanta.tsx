"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { portalChatAction } from "@/server/actions/portal/chat.action";

type Props = { portalToken: string; projectId: string };

type Turn = { role: "user" | "assistant"; text: string };

const SUGESTOES = [
  "Quantos quartos vai ter minha casa?",
  "Por que escolheram o piso cerâmico?",
  "Quando o projeto fica pronto?",
  "O que está incluso no contrato?",
];

export function ChatDaPlanta({ portalToken, projectId }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || pending) return;
    const next: Turn = { role: "user", text: question };
    setTurns((t) => [...t, next]);
    setInput("");
    setPending(true);
    try {
      const r = await portalChatAction({
        token: portalToken,
        project_id: projectId,
        question,
      });
      if (!r.ok) {
        const isRateLimit = r.error.toLowerCase().includes("muitas tentativas");
        const friendlyMsg = isRateLimit
          ? "Você fez muitas perguntas em pouco tempo. Aguarde um pouco e tente de novo, ou peça diretamente ao seu arquiteto."
          : `Não consegui responder agora. Pode reformular a pergunta ou perguntar ao seu arquiteto pelo portal. (Detalhe técnico: ${r.error})`;
        toast.error(isRateLimit ? "Limite de perguntas atingido" : "Não consegui responder");
        setTurns((t) => [...t, { role: "assistant", text: friendlyMsg }]);
      } else {
        setTurns((t) => [...t, { role: "assistant", text: r.answer }]);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tire dúvidas sobre seu projeto</CardTitle>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pergunte em português comum. Eu uso os dados do projeto que seu arquiteto compartilhou
          aqui para te explicar.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {turns.length === 0 ? (
          <div>
            <p className="mb-2 text-xs text-zinc-500">Sugestões:</p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  disabled={pending}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {turns.map((t, i) => (
              <div
                key={i}
                className={
                  t.role === "user"
                    ? "ml-8 rounded-md bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "mr-8 rounded-md bg-zinc-100 px-3 py-2 text-sm whitespace-pre-wrap text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                }
              >
                {t.text}
              </div>
            ))}
            {pending ? <p className="mr-8 text-xs text-zinc-500">Pensando…</p> : null}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder="Pergunte algo sobre o projeto…"
            disabled={pending}
          />
          <Button onClick={() => ask(input)} disabled={pending || !input.trim()}>
            {pending ? "…" : "Perguntar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
