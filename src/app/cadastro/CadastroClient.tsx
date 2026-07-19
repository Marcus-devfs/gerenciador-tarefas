"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Mail, Lock, User, Building2, Briefcase, UserCircle } from "lucide-react";
import AuthMarketingPanel, { AuthMobileBrand } from "@/components/auth/AuthMarketingPanel";

const inputClass =
  "w-full pl-8 pr-3 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-50 transition-colors";

export default function CadastroClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    area: "",
    funcao: "",
    superiorEmail: "",
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao criar conta.");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (!result?.ok) {
        router.push("/login?registered=1");
        return;
      }

      router.push("/");
    } catch {
      setError("Erro ao criar conta. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <AuthMarketingPanel />

      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-14 overflow-y-auto">
        <AuthMobileBrand />

        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h2 className="text-[26px] font-bold text-surface-900 leading-tight mb-2">
              Criar conta
            </h2>
            <p className="text-surface-400 text-[14px] leading-relaxed">
              Preencha seus dados para acessar a plataforma. Campos opcionais ajudam na organização interna.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 leading-relaxed">
                {error}
              </div>
            )}

            <Field icon={User} label="Nome completo" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                required
                disabled={loading}
                className={inputClass}
              />
            </Field>

            <Field icon={Mail} label="E-mail corporativo" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="seu.email@melies.com.br"
                autoComplete="email"
                required
                disabled={loading}
                className={inputClass}
              />
            </Field>

            <Field icon={Lock} label="Senha" required>
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={loading}
                className={inputClass}
              />
            </Field>

            <Field icon={Lock} label="Confirmar senha" required>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                required
                disabled={loading}
                className={inputClass}
              />
            </Field>

            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="text-[12px] text-brand-600 font-medium hover:underline pt-1"
            >
              {showOptional ? "Ocultar campos opcionais" : "Adicionar área, função e superior (opcional)"}
            </button>

            {showOptional && (
              <div className="space-y-3 pt-1 border-t border-surface-100">
                <Field icon={Building2} label="Área na empresa">
                  <input
                    type="text"
                    value={form.area}
                    onChange={(e) => updateField("area", e.target.value)}
                    placeholder="Ex.: Tecnologia, Operações"
                    disabled={loading}
                    className={inputClass}
                  />
                </Field>

                <Field icon={Briefcase} label="Função">
                  <input
                    type="text"
                    value={form.funcao}
                    onChange={(e) => updateField("funcao", e.target.value)}
                    placeholder="Ex.: Analista, Coordenador"
                    disabled={loading}
                    className={inputClass}
                  />
                </Field>

                <Field icon={UserCircle} label="E-mail do superior">
                  <input
                    type="email"
                    value={form.superiorEmail}
                    onChange={(e) => updateField("superiorEmail", e.target.value)}
                    placeholder="superior@melies.com.br"
                    disabled={loading}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Criar conta
            </button>
          </form>

          <p className="text-center text-[13px] text-surface-500 mt-6">
            Já tem conta?{" "}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>

          <p className="text-center text-[11px] text-surface-300 mt-6">
            © {new Date().getFullYear()} Méliès · Uso interno
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  required,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-surface-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none z-10" />
        {children}
      </div>
    </div>
  );
}
