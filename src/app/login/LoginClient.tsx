"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ShieldCheck, Mail, Lock } from "lucide-react";
import AuthMarketingPanel, { AuthMobileBrand } from "@/components/auth/AuthMarketingPanel";

interface Props {
  authError?: string | null;
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Configuração de autenticação incompleta. Verifique a variável AUTH_SECRET.",
  AccessDenied: "Acesso negado. Sua conta não tem permissão para entrar.",
  Verification: "Link de verificação inválido ou expirado.",
  Callback: "Erro no callback de autenticação.",
  CredentialsSignin: "E-mail ou senha incorretos.",
  Default: "Erro ao autenticar. Tente novamente.",
};

export default function LoginClient({ authError }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | false>(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const authErrorMessage = authError
    ? AUTH_ERROR_MESSAGES[authError] ?? AUTH_ERROR_MESSAGES.Default
    : null;

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      setFormError("Informe um e-mail válido.");
      return;
    }
    if (!password) {
      setFormError("Informe sua senha.");
      return;
    }
    setFormError("");
    setLoading("credentials");

    const result = await signIn("credentials", {
      email: normalized,
      password,
      redirect: false,
    });

    if (!result?.ok) {
      setFormError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="min-h-screen flex">
      <AuthMarketingPanel />

      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-14">
        <AuthMobileBrand />

        <div className="w-full max-w-[360px]">
          <div className="mb-8">
            <h2 className="text-[26px] font-bold text-surface-900 leading-tight mb-2">
              Bem-vindo de volta
            </h2>
            <p className="text-surface-400 text-[14px] leading-relaxed">
              Entre com seu e-mail e senha cadastrados.
            </p>
          </div>

          <div className="space-y-3">
            {(authErrorMessage || formError) && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 leading-relaxed">
                {formError || authErrorMessage}
              </div>
            )}

            <form onSubmit={handleCredentialsLogin} className="space-y-2">
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFormError(""); }}
                  placeholder="seu.email@melies.com.br"
                  autoComplete="email"
                  disabled={loading !== false}
                  className="w-full pl-8 pr-3 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-50 transition-colors"
                />
              </div>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFormError(""); }}
                  placeholder="Senha"
                  autoComplete="current-password"
                  disabled={loading !== false}
                  className="w-full pl-8 pr-3 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-50 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading !== false || !email.trim() || !password}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading === "credentials" && <Loader2 size={13} className="animate-spin" />}
                Entrar com e-mail e senha
              </button>
            </form>

            <div className="flex items-start gap-2.5 bg-surface-50 border border-surface-100 rounded-xl p-3.5">
              <ShieldCheck size={14} className="text-brand-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-surface-500 leading-relaxed">
                Acesso restrito a colaboradores. Ainda não tem conta?{" "}
                <Link href="/cadastro" className="text-brand-600 font-medium hover:underline">
                  Cadastre-se
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-[11px] text-surface-300 mt-8">
            © {new Date().getFullYear()} Méliès · Uso interno
          </p>
        </div>
      </div>
    </div>
  );
}
