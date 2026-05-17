"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signInWithOAuthAction } from "@/server/actions/auth/oauth.action";
import { toast } from "sonner";

type Props = { enabled: boolean };

export function GoogleOAuthButton({ enabled }: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await signInWithOAuthAction("google");
      if (result && "error" in result) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={!enabled || pending}
      onClick={onClick}
      title={enabled ? undefined : "Em breve"}
    >
      <GoogleLogo />
      Continuar com Google
    </Button>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" className="mr-2">
      <path
        d="M22.5 12.27c0-.79-.07-1.55-.21-2.27H12v4.3h5.87a5.04 5.04 0 0 1-2.18 3.3v2.74h3.52c2.06-1.9 3.25-4.7 3.25-8.07Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.94 0 5.4-.97 7.2-2.66l-3.52-2.73c-.98.66-2.23 1.05-3.68 1.05-2.83 0-5.23-1.91-6.09-4.48H2.27v2.81A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.91 14.18A6.62 6.62 0 0 1 5.55 12c0-.76.13-1.5.36-2.18V7.01H2.27a11 11 0 0 0 0 9.98l3.64-2.81Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.6 0 3.04.55 4.17 1.62l3.12-3.12C17.39 2.06 14.95 1 12 1A11 11 0 0 0 2.27 7.01l3.64 2.81C6.77 7.29 9.17 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}
