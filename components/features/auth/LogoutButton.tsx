"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/server/actions/auth/logout.action";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start"
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
    >
      {pending ? "Saindo…" : "Sair"}
    </Button>
  );
}
