"use client";

import { useRef } from "react";
import { useTasksQuery } from "@/hooks/useTasks";
import { useUserRole } from "@/hooks/useUserRole";
import { buildCollaboratorData, buildProjectData } from "@/lib/reportMetrics";
import { buildHoursSummary, resolveHorasContratadasMes } from "@/lib/operationalReportMetrics";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import { CheckCircle2, Clock, ListTodo, AlertCircle, XCircle, Timer, AlertTriangle } from "lucide-react";
import ExportButtons from "@/components/export/ExportButtons";
import OperationalReportButton from "@/components/export/OperationalReportButton";
import { useSettingsQuery } from "@/hooks/useSettings";
import type { Task } from "@/types";
import { StatusBadge, PriorityBadge } from "@/components/tasks/StatusBadge";
import Link from "next/link";

interface Props { isAdmin: boolean; userEmail: string; userName: string; }

const STATUS_COLORS: Record<string, string> = {
  pendente: "#94a3b8",
  em_andamento: "#3b82f6",
  concluido: "#f39519",
  cancelado: "#ef4444",
};

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-lg ${accent} shrink-0`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-surface-900 leading-tight">{value}</p>
        <p className="text-xs text-surface-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-surface-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold text-surface-700">{children}</h2>;
}

export default function RelatoriosClient({ isAdmin, userEmail, userName }: Props) {
  const exportRef = useRef<HTMLDivElement>(null);
  const { data: allTasks = [] } = useTasksQuery();
  const { data: settings } = useSettingsQuery();
  const { isTeamLeader, canViewTeam, teamLabel } = useUserRole(isAdmin);
  const tasks = allTasks;

  const total = tasks.length;
  const concluido = tasks.filter((t) => t.status === "concluido").length;
  const emAndamento = tasks.filter((t) => t.status === "em_andamento").length;
  const pendente = tasks.filter((t) => t.status === "pendente").length;
  const cancelado = tasks.filter((t) => t.status === "cancelado").length;
  const taxa = total > 0 ? Math.round((concluido / total) * 100) : 0;
  const totalEst = tasks.reduce((s, t) => s + (t.tempoEstimado ?? 0), 0);
  const totalPrev = tasks.reduce((s, t) => s + (t.tempoPrevisto ?? 0), 0);
  const comImpeditivo = tasks.filter((t) => t.impeditivo && t.impeditivo.trim()).length;

  const statusPie = [
    { name: "Concluído", value: concluido, color: STATUS_COLORS.concluido },
    { name: "Em andamento", value: emAndamento, color: STATUS_COLORS.em_andamento },
    { name: "Pendente", value: pendente, color: STATUS_COLORS.pendente },
    { name: "Cancelado", value: cancelado, color: STATUS_COLORS.cancelado },
  ].filter((d) => d.value > 0);

  const projectData = buildProjectData(tasks);
  const collaboratorData = buildCollaboratorData(tasks);
  const horasContratadasMes = resolveHorasContratadasMes(settings);
  const hoursSummary = buildHoursSummary(tasks, horasContratadasMes);

  const tempoData = tasks
    .filter((t) => t.tempoEstimado || t.tempoPrevisto)
    .slice(0, 8)
    .map((t) => ({
      name: t.title.length > 20 ? t.title.slice(0, 20) + "…" : t.title,
      estimado: t.tempoEstimado ?? 0,
      previsto: t.tempoPrevisto ?? 0,
    }));

  return (
    <div className="p-4 md:p-6 max-w-[1300px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900">
            {isTeamLeader ? "Relatórios da Equipe" : "Relatórios"}
          </h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {isTeamLeader && teamLabel ? `${teamLabel} · ` : canViewTeam ? "Indicadores consolidados · " : "Seus indicadores · "}
            gerado em {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <OperationalReportButton
            tasks={tasks}
            exportRef={exportRef}
            reporterName={userName}
            reporterEmail={userEmail}
            managerEmail={settings?.managerEmail}
            managerName={settings?.managerName}
            horasContratadasMes={horasContratadasMes}
          />
          <ExportButtons tasks={tasks} exportRef={exportRef} filenamePrefix="relatorio" />
        </div>
      </div>

      <div ref={exportRef} className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total de tarefas" value={total} icon={ListTodo} accent="bg-surface-500" />
        <KpiCard label="Concluídas" value={concluido} sub={`${taxa}% do total`} icon={CheckCircle2} accent="bg-brand-500" />
        <KpiCard label="Em andamento" value={emAndamento} icon={Clock} accent="bg-blue-500" />
        <KpiCard label="Pendentes" value={pendente} icon={AlertCircle} accent="bg-surface-400" />
        <KpiCard label="Canceladas" value={cancelado} icon={XCircle} accent="bg-red-500" />
        <KpiCard label="Com impeditivo" value={comImpeditivo} icon={AlertCircle} accent="bg-amber-500" />
        <KpiCard label="Total estimado" value={`${totalEst}h`} icon={Timer} accent="bg-violet-500" />
        <KpiCard label="Total previsto" value={`${totalPrev}h`} sub={totalPrev > totalEst ? `+${totalPrev - totalEst}h acima do estimado` : undefined} icon={Timer} accent={totalPrev > totalEst ? "bg-amber-500" : "bg-brand-500"} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <SectionTitle>Distribuição por status</SectionTitle>
          <ResponsiveContainer width="100%" height={220} className="mt-3">
            <PieChart>
              <Pie data={statusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}`, ""]} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <SectionTitle>Tarefas por projeto</SectionTitle>
          <ResponsiveContainer width="100%" height={220} className="mt-3">
            <BarChart data={projectData} layout="vertical" barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="pendente" name="Pendente" fill="#94a3b8" stackId="a" />
              <Bar dataKey="em_andamento" name="Em andamento" fill="#3b82f6" stackId="a" />
              <Bar dataKey="concluido" name="Concluído" fill="#f39519" stackId="a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isTeamLeader && collaboratorData.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <SectionTitle>Tarefas por colaborador</SectionTitle>
          <ResponsiveContainer width="100%" height={Math.max(240, collaboratorData.length * 52)} className="mt-3">
            <BarChart data={collaboratorData} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Legend iconSize={8} />
              <Bar dataKey="pendente" name="Pendente" fill="#94a3b8" stackId="a" />
              <Bar dataKey="em_andamento" name="Em andamento" fill="#3b82f6" stackId="a" />
              <Bar dataKey="concluido" name="Concluído" fill="#f39519" stackId="a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <SectionTitle>Tempo estimado vs. previsto (h)</SectionTitle>
          <ResponsiveContainer width="100%" height={220} className="mt-3">
            <BarChart data={tempoData} barGap={4} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconSize={8} />
              <Bar dataKey="estimado" name="Estimado" fill="#f39519" radius={[3, 3, 0, 0]} />
              <Bar dataKey="previsto" name="Previsto" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Horas contratadas do mês */}
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <SectionTitle>Horas contratadas (mês)</SectionTitle>
          {hoursSummary.horasContratadas === undefined ? (
            <div className="mt-3 flex flex-col items-center justify-center text-center py-8">
              <Timer size={22} className="text-surface-300 mb-2" />
              <p className="text-xs text-surface-400 max-w-[220px]">
                Defina suas horas contratadas por mês em{" "}
                <Link href="/configuracoes" className="text-brand-600 font-medium hover:text-brand-700">
                  Configurações
                </Link>{" "}
                para acompanhar o consumo mensal.
              </p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190} className="mt-3">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Feitas", value: Math.min(hoursSummary.horasFeitas, hoursSummary.horasContratadas) },
                      { name: "Restantes", value: hoursSummary.horasRestantes ?? 0 },
                    ]}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={80} startAngle={90} endAngle={-270}
                    paddingAngle={2} dataKey="value"
                  >
                    <Cell fill={
                      hoursSummary.alertLevel === "excedido" ? "#dc2626" :
                      hoursSummary.alertLevel === "atencao" ? "#d97706" : "#f39519"
                    } />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}h`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="text-center">
                  <p className="text-base font-bold text-surface-900">{hoursSummary.horasFeitas}h</p>
                  <p className="text-[9px] text-surface-400 leading-tight">Feitas</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-surface-900">{hoursSummary.horasRestantes}h</p>
                  <p className="text-[9px] text-surface-400 leading-tight">Restantes</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-surface-900">{hoursSummary.horasContratadas}h</p>
                  <p className="text-[9px] text-surface-400 leading-tight">Contratadas</p>
                </div>
              </div>
              {hoursSummary.alertLevel !== "ok" && (
                <div className={`mt-3 flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] ${
                  hoursSummary.alertLevel === "excedido"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                }`}>
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span>
                    {hoursSummary.alertLevel === "excedido"
                      ? `Horas contratadas ultrapassadas em ${hoursSummary.horasFeitas - hoursSummary.horasContratadas}h neste mês.`
                      : `Você já usou ${hoursSummary.percentual}% das horas contratadas do mês.`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detailed table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
          <SectionTitle>Detalhamento das tarefas</SectionTitle>
          <span className="text-xs text-surface-400">{tasks.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-50">
                {["Título", "Responsável", "Projeto", "Status", "Prioridade", "Situação atual", "Prazo", "Entrega", "Conclusão", "T.Est", "T.Prev", "%"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400 border-b border-surface-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-surface-50/60 border-b border-surface-100 last:border-0">
                  <td className="px-3 py-2.5 text-xs font-medium text-surface-900 max-w-[200px]">
                    <span title={t.title}>{t.title.length > 35 ? t.title.slice(0, 35) + "…" : t.title}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-surface-600 whitespace-nowrap">{t.assignedToName}</td>
                  <td className="px-3 py-2.5 text-xs text-surface-500 whitespace-nowrap">{t.projeto || "—"}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                  <td className="px-3 py-2.5"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-3 py-2.5 text-xs text-surface-600 max-w-[200px]">
                    <span title={t.situacaoAtual}>{t.situacaoAtual ? (t.situacaoAtual.length > 45 ? t.situacaoAtual.slice(0, 45) + "…" : t.situacaoAtual) : "—"}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-surface-500 whitespace-nowrap tabular-nums">{t.dueDate || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-surface-500 whitespace-nowrap tabular-nums">{t.dataEntrega || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-surface-500 whitespace-nowrap tabular-nums">{t.dataConclusao || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-surface-500 tabular-nums">{t.tempoEstimado != null ? `${t.tempoEstimado}h` : "—"}</td>
                  <td className="px-3 py-2.5 text-xs tabular-nums">
                    {t.tempoPrevisto != null ? (
                      <span className={t.tempoPrevisto > (t.tempoEstimado ?? 0) ? "text-amber-600 font-medium" : "text-surface-500"}>
                        {t.tempoPrevisto}h
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 min-w-[70px]">
                      <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                        <div className="h-1.5 bg-brand-500 rounded-full" style={{ width: `${t.progress}%` }} />
                      </div>
                      <span className="text-[10px] text-surface-500 tabular-nums shrink-0">{t.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
