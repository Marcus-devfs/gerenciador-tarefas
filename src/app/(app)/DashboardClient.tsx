"use client";

import { useState, useMemo, useRef } from "react";
import { useTasksQuery } from "@/hooks/useTasks";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotasQuery, useCreateNota, useUpdateNota, useDeleteNota } from "@/hooks/useNotas";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import {
  CheckCircle2, Clock, ListTodo, AlertCircle, TrendingUp, Loader2,
  Plus, X, Save, Trash2, Pencil, ChevronDown, ChevronUp,
  Bell, CalendarDays, BookOpen,
} from "lucide-react";
import Link from "next/link";
import ExportButtons from "@/components/export/ExportButtons";
import type { Note, NoteType } from "@/types/note";
import { NOTE_TYPE_LABEL, NOTE_TYPE_COLOR, DIAS_SEMANA } from "@/types/note";

interface Props { isAdmin: boolean; userEmail: string; }

// ── Helpers ───────────────────────────────────────────────────────────
function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}
function getTodayDow() {
  return new Date().getDay();
}

function isNotaToday(nota: Note, todayStr: string, todayDow: number): boolean {
  if (nota.data === todayStr) return true;
  if (nota.recorrencia === "semanal" && nota.diasSemana?.includes(todayDow)) return true;
  return false;
}

function recorrenciaLabel(nota: Note): string {
  if (nota.recorrencia !== "semanal" || !nota.diasSemana?.length) return "";
  return "Toda " + nota.diasSemana.map((d) => DIAS_SEMANA[d]).join(", ");
}

// ── Metric card ───────────────────────────────────────────────────────
function MetricCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-surface-900">{value}</p>
        <p className="text-sm text-surface-500">{label}</p>
        {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-surface-100 text-surface-500",
  em_andamento: "bg-blue-50 text-blue-600",
  concluido: "bg-brand-50 text-brand-600",
  cancelado: "bg-red-50 text-red-500",
};
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente", em_andamento: "Em andamento", concluido: "Concluído", cancelado: "Cancelado",
};
const PRIORITY_COLOR: Record<string, string> = {
  alta: "text-red-500", media: "text-amber-500", baixa: "text-surface-400",
};

// ── Agenda do Dia ─────────────────────────────────────────────────────
function AgendaHoje({
  notas,
  onEdit,
}: {
  notas: Note[];
  onEdit: (nota: Note) => void;
}) {
  const lembretes = notas.filter((n) => n.tipo === "lembrete");
  const reunioes = notas.filter((n) => n.tipo === "reuniao");
  const outros = notas.filter((n) => n.tipo === "anotacao");

  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-100 bg-gradient-to-r from-surface-50 to-white">
        <CalendarDays size={14} className="text-brand-600 shrink-0" />
        <span className="text-[12px] font-bold text-surface-700 uppercase tracking-wider">Agenda de hoje</span>
        <span className="text-[11px] text-surface-400 ml-auto">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      <div className="px-4 py-3 flex flex-wrap gap-2">
        {notas.length === 0 && (
          <p className="text-[12px] text-surface-400 italic py-1">✓ Nenhum compromisso para hoje</p>
        )}

        {lembretes.map((n) => (
          <button
            key={n.id}
            onClick={() => onEdit(n)}
            className="group flex items-start gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 hover:border-purple-400 hover:shadow-sm transition-all text-left"
          >
            <Bell size={13} className="text-purple-500 mt-0.5 shrink-0 group-hover:animate-bounce" />
            <div>
              <p className="text-[12px] font-semibold text-purple-800 leading-tight">{n.titulo}</p>
              {recorrenciaLabel(n) && (
                <p className="text-[10px] text-purple-500 mt-0.5">{recorrenciaLabel(n)}</p>
              )}
            </div>
          </button>
        ))}

        {reunioes.map((n) => (
          <button
            key={n.id}
            onClick={() => onEdit(n)}
            className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 hover:border-blue-400 hover:shadow-sm transition-all text-left"
          >
            <CalendarDays size={13} className="text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-semibold text-blue-800 leading-tight">{n.titulo}</p>
              {n.tarefaTitulo && (
                <p className="text-[10px] text-blue-400 mt-0.5">↗ {n.tarefaTitulo}</p>
              )}
            </div>
          </button>
        ))}

        {outros.map((n) => (
          <button
            key={n.id}
            onClick={() => onEdit(n)}
            className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 hover:border-amber-400 hover:shadow-sm transition-all text-left"
          >
            <BookOpen size={13} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[12px] font-semibold text-amber-800 leading-tight">{n.titulo}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Note Drawer ───────────────────────────────────────────────────────
function NotaDrawer({
  nota,
  tasks,
  onClose,
}: {
  nota: Note | null;
  tasks: { id: string; title: string }[];
  onClose: () => void;
}) {
  const create = useCreateNota();
  const update = useUpdateNota();
  const isEditing = !!nota;

  const [titulo, setTitulo] = useState(nota?.titulo ?? "");
  const [conteudo, setConteudo] = useState(nota?.conteudo ?? "");
  const [tipo, setTipo] = useState<NoteType>(nota?.tipo ?? "anotacao");
  const [tarefaId, setTarefaId] = useState(nota?.tarefaId ?? "");
  const [data, setData] = useState(nota?.data ?? new Date().toISOString().split("T")[0]);
  const [recorrencia, setRecorrencia] = useState<"semanal" | null>(nota?.recorrencia ?? null);
  const [diasSemana, setDiasSemana] = useState<number[]>(nota?.diasSemana ?? []);

  const isBusy = create.isPending || update.isPending;

  function toggleDia(i: number) {
    setDiasSemana((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort()
    );
  }

  async function handleSave() {
    if (!titulo.trim()) return;
    const linkedTask = tasks.find((t) => t.id === tarefaId);
    const payload = {
      titulo,
      conteudo,
      tipo,
      tarefaId: tarefaId || undefined,
      tarefaTitulo: linkedTask?.title || undefined,
      data,
      recorrencia: tipo === "lembrete" ? recorrencia : null,
      diasSemana: tipo === "lembrete" && recorrencia === "semanal" ? diasSemana : [],
    };
    if (isEditing) {
      await update.mutateAsync({ id: nota!.id, updates: payload });
    } else {
      await create.mutateAsync(payload as any);
    }
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[400px] max-w-[95vw] bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <h2 className="text-sm font-bold text-surface-900">{isEditing ? "Editar" : "Nova anotação"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            {(["reuniao", "anotacao", "lembrete"] as NoteType[]).map((t) => {
              const c = NOTE_TYPE_COLOR[t];
              return (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                    tipo === t ? `${c.bg} ${c.text} border-current` : "bg-surface-50 text-surface-500 border-surface-200"
                  }`}
                >
                  {c.icon} {NOTE_TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>

          {/* Título */}
          <div>
            <label className="block text-[12px] font-medium text-surface-700 mb-1">Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={
                tipo === "lembrete" ? "ex: Envio de relatório gerencial" :
                tipo === "reuniao"  ? "ex: Reunião com Jackson — Zendesk" :
                "ex: Decisões sobre o projeto X"
              }
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>

          {/* Data */}
          <div>
            <label className="block text-[12px] font-medium text-surface-700 mb-1">
              {tipo === "lembrete" && recorrencia === "semanal" ? "Data de início" : "Data"}
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>

          {/* Recorrência — só para lembrete */}
          {tipo === "lembrete" && (
            <div>
              <label className="block text-[12px] font-medium text-surface-700 mb-2">Recorrência</label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { setRecorrencia(null); setDiasSemana([]); }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                    !recorrencia
                      ? "bg-surface-900 text-white border-surface-900"
                      : "bg-surface-50 text-surface-500 border-surface-200 hover:border-surface-400"
                  }`}
                >
                  Não repete
                </button>
                <button
                  onClick={() => setRecorrencia("semanal")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                    recorrencia === "semanal"
                      ? "bg-purple-500 text-white border-purple-500"
                      : "bg-surface-50 text-surface-500 border-surface-200 hover:border-purple-300"
                  }`}
                >
                  🔁 Semanal
                </button>
              </div>

              {recorrencia === "semanal" && (
                <div>
                  <p className="text-[11px] text-surface-400 mb-2">Dias da semana</p>
                  <div className="flex gap-1.5">
                    {DIAS_SEMANA.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => toggleDia(i)}
                        className={`w-9 h-9 rounded-full text-[11px] font-bold border transition-all ${
                          diasSemana.includes(i)
                            ? "bg-purple-500 text-white border-purple-500 shadow-sm"
                            : "bg-surface-50 text-surface-400 border-surface-200 hover:border-purple-300 hover:text-purple-500"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  {diasSemana.length > 0 && (
                    <p className="text-[11px] text-purple-600 mt-1.5 font-medium">
                      Toda {diasSemana.map((d) => DIAS_SEMANA[d]).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Conteúdo */}
          <div>
            <label className="block text-[12px] font-medium text-surface-700 mb-1">
              {tipo === "lembrete" ? "Detalhe (opcional)" : "Conteúdo"}
            </label>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={4}
              placeholder={
                tipo === "lembrete" ? "Contexto, destinatários, link..." :
                tipo === "reuniao"  ? "Decisões, próximas ações, participantes..." :
                "Detalhes, referências..."
              }
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
            />
          </div>

          {/* Vincular tarefa */}
          {tasks.length > 0 && (
            <div>
              <label className="block text-[12px] font-medium text-surface-700 mb-1">Vincular a uma tarefa (opcional)</label>
              <select
                value={tarefaId}
                onChange={(e) => setTarefaId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
              >
                <option value="">— Sem vínculo —</option>
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="border-t border-surface-200 px-5 py-3 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={isBusy || !titulo.trim()}
            className="flex-1 py-2 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────
export default function DashboardClient({ isAdmin, userEmail }: Props) {
  const { data: allTasks = [], isLoading } = useTasksQuery();
  const { isTeamLeader, canViewTeam, teamLabel } = useUserRole(isAdmin);
  const { data: notas = [] } = useNotasQuery();
  const deleteNota = useDeleteNota();
  const exportRef = useRef<HTMLDivElement>(null);

  const [notaDrawer, setNotaDrawer] = useState<Note | null | "new">(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const todayStr = getTodayStr();
  const todayDow = getTodayDow();

  const visibleTasks = allTasks;

  const total = visibleTasks.length;
  const pending = visibleTasks.filter((t) => t.status === "pendente").length;
  const inProgress = visibleTasks.filter((t) => t.status === "em_andamento").length;
  const done = visibleTasks.filter((t) => t.status === "concluido").length;
  const avgProgress = total > 0
    ? Math.round(visibleTasks.reduce((acc, t) => acc + t.progress, 0) / total)
    : 0;

  const recentTasks = [...visibleTasks]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  // Notas de hoje (lembretes recorrentes + data exata)
  const notasHoje = useMemo(
    () => notas
      .filter((n) => isNotaToday(n, todayStr, todayDow))
      .sort((a, b) => {
        const ORDER: Record<NoteType, number> = { lembrete: 0, reuniao: 1, anotacao: 2 };
        return ORDER[a.tipo] - ORDER[b.tipo];
      }),
    [notas, todayStr, todayDow]
  );

  // Mapa taskId → notas vinculadas
  const notasByTask = useMemo(() => {
    const m: Record<string, Note[]> = {};
    for (const n of notas) {
      if (n.tarefaId) {
        if (!m[n.tarefaId]) m[n.tarefaId] = [];
        m[n.tarefaId].push(n);
      }
    }
    return m;
  }, [notas]);

  // Notas ordenadas para o painel lateral:
  // 1. Hoje (lembretes recorrentes ou data=hoje)
  // 2. Lembretes futuros (por data asc)
  // 3. Resto recente (data desc)
  const sortedNotas = useMemo(() => {
    const hoje = notas.filter((n) => isNotaToday(n, todayStr, todayDow));
    const futuros = notas
      .filter((n) => !isNotaToday(n, todayStr, todayDow) && n.tipo === "lembrete" && n.data > todayStr)
      .sort((a, b) => a.data.localeCompare(b.data));
    const resto = notas
      .filter((n) => !isNotaToday(n, todayStr, todayDow) && !(n.tipo === "lembrete" && n.data > todayStr))
      .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt));
    return [...hoje, ...futuros, ...resto];
  }, [notas, todayStr, todayDow]);

  const visibleNotas = sortedNotas.slice(0, 6);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900">
            {isTeamLeader ? "Painel da Equipe" : canViewTeam ? "Visão Geral" : "Minha Visão Geral"}
          </h1>
          <p className="text-sm text-surface-400 mt-0.5">
            {isTeamLeader && teamLabel && `${teamLabel} · `}
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <ExportButtons tasks={visibleTasks} exportRef={exportRef} filenamePrefix="dashboard" />
      </div>

      <div ref={exportRef} className="space-y-6">

      {/* Agenda do dia — oculta para líder (visão pessoal) */}
      {!isTeamLeader && <AgendaHoje notas={notasHoje} onEdit={(n) => setNotaDrawer(n)} />}

      {/* Task KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard label={isTeamLeader ? "Total da equipe" : "Total de tarefas"} value={total} icon={ListTodo} color="bg-surface-600" />
        <MetricCard label="Pendentes" value={pending} icon={AlertCircle} color="bg-surface-400" />
        <MetricCard label="Em andamento" value={inProgress} icon={Clock} color="bg-blue-500" />
        <MetricCard label="Concluídas" value={done} icon={CheckCircle2} color="bg-brand-500" sub={`${avgProgress}% de progresso médio`} />
      </div>

      {/* Charts (gestor/admin) or progress bar (personal) */}
      {canViewTeam && <DashboardCharts tasks={visibleTasks} showCollaboratorChart={isTeamLeader} />}
      {!canViewTeam && (
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-brand-500" />
            <h3 className="text-sm font-semibold text-surface-700">Meu progresso geral</h3>
            <span className="ml-auto text-2xl font-bold text-brand-500">{avgProgress}%</span>
          </div>
          <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
            <div className="h-2 bg-brand-500 rounded-full transition-all" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>
      )}

      {/* Two-column: recent tasks + notes */}
      <div className={`grid grid-cols-1 ${isTeamLeader ? "" : "lg:grid-cols-2"} gap-4`}>

        {/* Recent tasks — with linked-note count */}
        <div className="bg-white rounded-xl border border-surface-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h3 className="text-sm font-semibold text-surface-700">
              {isTeamLeader ? "Atividade recente da equipe" : "Atividade recente"}
            </h3>
            <Link href="/tarefas" className="text-xs text-brand-500 hover:text-brand-600 font-medium">Ver todas →</Link>
          </div>
          <div className="divide-y divide-surface-50">
            {recentTasks.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-surface-400">Nenhuma tarefa ainda</p>
            ) : (
              recentTasks.map((task) => {
                const taskNotas = notasByTask[task.id] ?? [];
                const isExpanded = expandedTaskId === task.id;
                return (
                  <div key={task.id}>
                    <div className="px-5 py-3.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {canViewTeam && (
                            <p className="text-xs text-brand-600 font-medium">{task.assignedToName}</p>
                          )}
                          <p className="text-xs text-surface-400">Atualizado {task.updatedAt}</p>
                          {taskNotas.length > 0 && (
                            <button
                              onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded hover:bg-brand-100 transition-colors"
                            >
                              📝 {taskNotas.length} {taskNotas.length === 1 ? "nota" : "notas"}
                              {isExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${PRIORITY_COLOR[task.priority]}`}>
                          {task.priority}
                        </span>
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[task.status]}`}>
                          {STATUS_LABEL[task.status]}
                        </span>
                      </div>
                    </div>

                    {/* Notas vinculadas inline */}
                    {isExpanded && taskNotas.length > 0 && (
                      <div className="px-5 pb-3 space-y-1.5 bg-surface-50/70 border-t border-surface-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400 pt-2">Notas vinculadas</p>
                        {taskNotas.map((n) => {
                          const c = NOTE_TYPE_COLOR[n.tipo];
                          const isHoje = isNotaToday(n, todayStr, todayDow);
                          return (
                            <button
                              key={n.id}
                              onClick={() => setNotaDrawer(n)}
                              className="w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-surface-100 transition-colors group"
                            >
                              <span className="text-sm shrink-0">{c.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[12px] font-semibold text-surface-800 truncate">{n.titulo}</p>
                                  {isHoje && (
                                    <span className="text-[9px] font-bold bg-purple-100 text-purple-600 px-1 py-0.5 rounded shrink-0">HOJE</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-1 py-0.5 rounded ${c.bg} ${c.text}`}>{NOTE_TYPE_LABEL[n.tipo]}</span>
                                  <span className="text-[10px] text-surface-400">{n.data}</span>
                                  {n.recorrencia === "semanal" && n.diasSemana?.length ? (
                                    <span className="text-[10px] text-purple-500">🔁 Toda {n.diasSemana.map((d) => DIAS_SEMANA[d]).join(", ")}</span>
                                  ) : null}
                                </div>
                                {n.conteudo && (
                                  <p className="text-[11px] text-surface-500 mt-0.5 line-clamp-1">{n.conteudo}</p>
                                )}
                              </div>
                              <Pencil size={11} className="shrink-0 text-surface-300 group-hover:text-surface-500 mt-1" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Notes column — oculta para líder de equipe */}
        {!isTeamLeader && (
        <div className="bg-white rounded-xl border border-surface-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h3 className="text-sm font-semibold text-surface-700">Anotações</h3>
            <button
              onClick={() => setNotaDrawer("new")}
              className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 font-medium"
            >
              <Plus size={13} />
              Nova
            </button>
          </div>

          <div className="divide-y divide-surface-50">
            {visibleNotas.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-surface-400 mb-3">Nenhuma anotação ainda</p>
                <button
                  onClick={() => setNotaDrawer("new")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600"
                >
                  <Plus size={13} /> Criar primeira anotação
                </button>
              </div>
            ) : (
              visibleNotas.map((nota) => {
                const c = NOTE_TYPE_COLOR[nota.tipo];
                const isHoje = isNotaToday(nota, todayStr, todayDow);
                const isFuturo = nota.tipo === "lembrete" && nota.data > todayStr && !isHoje;
                const recLabel = recorrenciaLabel(nota);

                return (
                  <div key={nota.id} className={`px-5 py-3.5 flex items-start gap-3 group transition-colors ${isHoje ? "bg-purple-50/30" : ""}`}>
                    <span className="text-base shrink-0 mt-0.5">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-surface-800 truncate">{nota.titulo}</p>
                        {isHoje && (
                          <span className="text-[9px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full shrink-0">HOJE</span>
                        )}
                        {isFuturo && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full shrink-0">EM BREVE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>
                          {NOTE_TYPE_LABEL[nota.tipo]}
                        </span>
                        {recLabel ? (
                          <span className="text-[10px] text-purple-500 font-medium">🔁 {recLabel}</span>
                        ) : (
                          <span className="text-[11px] text-surface-400">{nota.data}</span>
                        )}
                        {nota.tarefaTitulo && (
                          <span className="text-[10px] text-brand-500 truncate max-w-[100px]">↗ {nota.tarefaTitulo}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setNotaDrawer(nota)}
                        className="p-1 rounded hover:bg-surface-100 text-surface-400 hover:text-surface-700"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => deleteNota.mutate(nota.id)}
                        className="p-1 rounded hover:bg-red-50 text-surface-400 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            {sortedNotas.length > 6 && (
              <div className="px-5 py-3 text-center">
                <span className="text-xs text-surface-400">{sortedNotas.length - 6} anotações mais antigas</span>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
      </div>

      {/* Note drawer */}
      {notaDrawer !== null && (
        <NotaDrawer
          nota={notaDrawer === "new" ? null : notaDrawer}
          tasks={visibleTasks.map((t) => ({ id: t.id, title: t.title }))}
          onClose={() => setNotaDrawer(null)}
        />
      )}
    </div>
  );
}
