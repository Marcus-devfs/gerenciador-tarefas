"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Users, FolderKanban, Save, Mail, PenLine, Lock, Clock } from "lucide-react";
import { useProjectsQuery, useCreateProject, useDeleteProject } from "@/hooks/useProjects";
import { useSettingsQuery, useUpdateSettings, useChangePassword } from "@/hooks/useSettings";

interface Props {
  userEmail: string;
  userName: string;
}

export default function ConfigClient({ userEmail, userName }: Props) {
  const { data: projects = [], isLoading: loadingProjects } = useProjectsQuery();
  const { data: settings, isLoading: loadingSettings } = useSettingsQuery();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const updateSettings = useUpdateSettings();
  const changePassword = useChangePassword();

  const [newProject, setNewProject] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [horasContratadasMes, setHorasContratadasMes] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [horasSaved, setHorasSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setManagerEmail(settings.managerEmail ?? "");
      setManagerName(settings.managerName ?? "");
      setHorasContratadasMes(settings.horasContratadasMes?.toString() ?? "");
    }
  }, [settings]);

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    const name = newProject.trim();
    if (!name) return;
    await createProject.mutateAsync(name);
    setNewProject("");
  }

  async function handleSaveManager(e: React.FormEvent) {
    e.preventDefault();
    await updateSettings.mutateAsync({
      managerEmail: managerEmail.trim().toLowerCase(),
      managerName: managerName.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleSaveHoras(e: React.FormEvent) {
    e.preventDefault();
    await updateSettings.mutateAsync({
      horasContratadasMes: horasContratadasMes.trim() === "" ? null : Number(horasContratadasMes),
    });
    setHorasSaved(true);
    setTimeout(() => setHorasSaved(false), 2500);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    await changePassword.mutateAsync({
      newPassword,
      confirmPassword,
    });
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 2500);
  }

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-surface-900">Configurações</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Gerencie sua conta, projetos e defina seu gestor para os reports operacionais.
        </p>
      </div>

      {/* Senha */}
      {settings?.hasPassword && (
        <section className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-brand-500" />
            <h2 className="text-sm font-bold text-surface-700">Alterar senha</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
            <div>
              <label className="text-xs font-medium text-surface-600 block mb-1.5">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 block mb-1.5">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={changePassword.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {changePassword.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar nova senha
              </button>
              {passwordSaved && <span className="text-xs text-brand-600 font-medium">Senha alterada!</span>}
              {changePassword.isError && (
                <span className="text-xs text-red-500">{(changePassword.error as Error).message}</span>
              )}
            </div>
          </form>
        </section>
      )}

      {/* Gestor */}
      <section className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-brand-500" />
          <h2 className="text-sm font-bold text-surface-700">Seu gestor</h2>
        </div>
        <p className="text-xs text-surface-500 leading-relaxed">
          Informe o e-mail corporativo do seu gestor. Não é necessário que ele já tenha conta —
          quando entrar na plataforma, verá suas tarefas e relatórios automaticamente.
        </p>

        {loadingSettings ? (
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <Loader2 size={14} className="animate-spin" /> Carregando…
          </div>
        ) : (
          <form onSubmit={handleSaveManager} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-surface-600 block mb-1.5">E-mail do gestor</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="email"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="gestor@melies.com.br"
                    className="w-full pl-8 pr-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-surface-600 block mb-1.5">Nome do gestor (opcional)</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={updateSettings.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {updateSettings.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar gestor
              </button>
              {saved && <span className="text-xs text-brand-600 font-medium">Salvo com sucesso!</span>}
              {updateSettings.isError && (
                <span className="text-xs text-red-500">{(updateSettings.error as Error).message}</span>
              )}
            </div>
          </form>
        )}

        {settings?.isManager && settings.subordinates.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-100">
            <p className="text-xs font-semibold text-surface-600 mb-2">Colaboradores vinculados a você</p>
            <div className="flex flex-wrap gap-2">
              {settings.subordinates.map((s) => (
                <span key={s.email} className="text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-full">
                  {s.name} · {s.email}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Horas contratadas */}
      <section className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-brand-500" />
          <h2 className="text-sm font-bold text-surface-700">Horas contratadas</h2>
        </div>
        <p className="text-xs text-surface-500 leading-relaxed">
          Informe quantas horas mensais você tem contratadas. No report semanal de{" "}
          <strong>Relatórios</strong>, você verá quantas horas já fez no mês, quantas restam,
          e um alerta antes de ultrapassar o limite.
        </p>

        {loadingSettings ? (
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <Loader2 size={14} className="animate-spin" /> Carregando…
          </div>
        ) : (
          <form onSubmit={handleSaveHoras} className="space-y-3 max-w-xs">
            <div>
              <label className="text-xs font-medium text-surface-600 block mb-1.5">Horas contratadas por mês</label>
              <div className="relative">
                <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={horasContratadasMes}
                  onChange={(e) => setHorasContratadasMes(e.target.value)}
                  placeholder="Ex: 160"
                  className="w-full pl-8 pr-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={updateSettings.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {updateSettings.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar horas
              </button>
              {horasSaved && <span className="text-xs text-brand-600 font-medium">Salvo com sucesso!</span>}
            </div>
          </form>
        )}
      </section>

      {/* Assinatura de e-mail */}
      <section className="bg-white rounded-xl border border-surface-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <PenLine size={16} className="text-brand-500" />
          <h2 className="text-sm font-bold text-surface-700">Assinatura de e-mail</h2>
        </div>
        <p className="text-xs text-surface-500 leading-relaxed">
          O e-mail abre em modo HTML no Outlook, permitindo inserir sua assinatura com imagem
          via <strong>Inserir → Assinatura</strong> após &quot;Atenciosamente,&quot;.
        </p>
        <ol className="text-xs text-surface-600 leading-relaxed list-decimal list-inside space-y-1.5 bg-surface-50 rounded-lg p-4 border border-surface-100">
          <li>Gere o report operacional e abra o <strong>.eml</strong> com duplo clique (Outlook Classic)</li>
          <li>Confirme que abriu para <strong>edição</strong> — deve aparecer o botão <strong>Enviar</strong></li>
          <li>Após &quot;Atenciosamente,&quot;, use <strong>Inserir → Assinatura</strong></li>
          <li>Revise e clique em <strong>Enviar</strong></li>
        </ol>
        <p className="text-[11px] text-surface-400">
          Se abrir só para leitura (Responder/Encaminhar), clique com o botão direito no .eml →
          Abrir com → Outlook (classic).
        </p>
      </section>

      {/* Projetos */}
      <section className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FolderKanban size={16} className="text-brand-500" />
          <h2 className="text-sm font-bold text-surface-700">Projetos</h2>
        </div>
        <p className="text-xs text-surface-500 leading-relaxed">
          Projetos disponíveis no select ao criar tarefas e nos relatórios por projeto.
        </p>

        <form onSubmit={handleAddProject} className="flex gap-2">
          <input
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            placeholder="Nome do novo projeto…"
            className="flex-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button
            type="submit"
            disabled={!newProject.trim() || createProject.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-800 hover:bg-surface-900 text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {createProject.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Adicionar
          </button>
        </form>

        {loadingProjects ? (
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <Loader2 size={14} className="animate-spin" /> Carregando projetos…
          </div>
        ) : (
          <ul className="divide-y divide-surface-100 border border-surface-100 rounded-xl overflow-hidden">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface-50/60">
                <span className="text-sm text-surface-800">{p.name}</span>
                <button
                  onClick={() => deleteProject.mutate(p.id)}
                  disabled={deleteProject.isPending}
                  className="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remover projeto"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {projects.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-surface-400">Nenhum projeto cadastrado</li>
            )}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-surface-300 text-center">
        Logado como {userName} ({userEmail})
      </p>
    </div>
  );
}
