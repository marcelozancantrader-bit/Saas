"use client";

import { useEffect, useRef, useState } from "react";
import { completeOnboardingTourAction } from "@/server/actions/onboarding/complete-tour.action";

type Props = {
  /** Se true, dispara o tour ao montar (primeira visita ao dashboard). */
  shouldShow: boolean;
};

/**
 * Tour guiado overlay usando Shepherd.js. Aparece SÓ no primeiro acesso
 * ao dashboard (controlado por server: `organizations.meta.onboarding.tour_completed_at`).
 * Camila pode pular a qualquer momento — flag salva mesmo se pular.
 *
 * Shepherd é importado dinamicamente pra não inflar o bundle inicial.
 */
export function OnboardingTour({ shouldShow }: Props) {
  const tourStartedRef = useRef(false);
  const [, setLoaded] = useState(false);

  useEffect(() => {
    if (!shouldShow || tourStartedRef.current) return;
    tourStartedRef.current = true;

    let cancelled = false;

    void (async () => {
      try {
        // Lazy load Shepherd + CSS
        const [{ default: Shepherd }] = await Promise.all([
          import("shepherd.js"),
          import("shepherd.js/dist/css/shepherd.css"),
        ]);
        if (cancelled) return;

        const tour = new Shepherd.Tour({
          useModalOverlay: true,
          defaultStepOptions: {
            classes: "memorial-tour-step",
            cancelIcon: { enabled: true },
            scrollTo: { behavior: "smooth", block: "center" },
            modalOverlayOpeningPadding: 6,
            modalOverlayOpeningRadius: 8,
          },
        });

        const finish = async () => {
          await completeOnboardingTourAction().catch(() => undefined);
        };
        tour.on("complete", finish);
        tour.on("cancel", finish);

        tour.addStep({
          id: "welcome",
          title: "Bem-vindo ao Memorial.ai 👋",
          text: "Vou te mostrar o essencial em 6 passos rápidos. Você pode pular agora pelo X — eu não volto a perguntar.",
          buttons: [
            { text: "Pular tour", action: tour.cancel, secondary: true },
            { text: "Próximo", action: tour.next },
          ],
        });

        tour.addStep({
          id: "novo-projeto",
          title: "Tudo começa por um projeto",
          text: "Clique em 'Novo projeto' (azul, no menu lateral) ou no botão do header. Cliente é opcional — você pode vincular depois.",
          attachTo: { element: "[data-tour='novo-projeto']", on: "right" },
          buttons: [
            { text: "Voltar", action: tour.back, secondary: true },
            { text: "Próximo", action: tour.next },
          ],
        });

        tour.addStep({
          id: "projetos",
          title: "Seus projetos vivem aqui",
          text: "Cada projeto tem abas pra cada etapa: cadastro, planta, validações zoneamento, briefing opcional, ART/RRT, alterações de escopo e diário de obra.",
          attachTo: { element: "[data-tour='projetos-link']", on: "right" },
          buttons: [
            { text: "Voltar", action: tour.back, secondary: true },
            { text: "Próximo", action: tour.next },
          ],
        });

        tour.addStep({
          id: "command-palette",
          title: "Atalho de tudo: Cmd+K (ou Ctrl+K)",
          text: "Abre a paleta de comandos pra navegar, criar ou pesquisar em segundos. Aprenda esse atalho e você corre o app inteiro.",
          buttons: [
            { text: "Voltar", action: tour.back, secondary: true },
            { text: "Próximo", action: tour.next },
          ],
        });

        tour.addStep({
          id: "checklist",
          title: "Checklist de primeiros passos",
          text: "Quando você criar o primeiro projeto, um card aparece aqui com 4 passos guiados (extrair planta → gerar doc → enviar ao portal). Conclui em ~30 minutos.",
          buttons: [
            { text: "Voltar", action: tour.back, secondary: true },
            { text: "Próximo", action: tour.next },
          ],
        });

        tour.addStep({
          id: "fim",
          title: "Pronto, é isso 🎉",
          text: "Qualquer dúvida, abre Cmd+K e digite 'ajuda' ou clica em 'Sobre' no rodapé. Boa obra!",
          buttons: [{ text: "Começar a usar", action: tour.complete }],
        });

        tour.start();
        setLoaded(true);
      } catch (err) {
        // Falha silenciosa — tour não-crítico. Marca como completo pra não retentar.
        console.error("Tour Shepherd falhou:", err);
        await completeOnboardingTourAction().catch(() => undefined);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldShow]);

  return null;
}
