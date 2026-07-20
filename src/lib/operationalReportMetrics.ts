import type { Task } from "@/types";
import { STATUS_LABELS } from "@/types";
import { buildCollaboratorData, buildProjectData } from "@/lib/reportMetrics";

export interface OperationalReportContext {
  reporterName: string;
  reporterEmail: string;
  managerName?: string;
  managerEmail?: string;
}

export type HoursAlertLevel = "ok" | "atencao" | "excedido";

export interface HoursSummary {
  horasContratadas?: number;
  horasFeitas: number;
  horasAlocadas: number;
  horasComprometidas: number;
  horasRestantes?: number;
  percentual?: number;
  alertLevel?: HoursAlertLevel;
}

export interface OperationalReportMetrics {
  total: number;
  concluido: number;
  emAndamento: number;
  pendente: number;
  cancelado: number;
  taxaConclusao: number;
  totalEstimado: number;
  totalPrevisto: number;
  comImpeditivo: number;
  statusBreakdown: { label: string; value: number; pct: number }[];
  projectSummary: ReturnType<typeof buildProjectData>;
  collaboratorSummary: ReturnType<typeof buildCollaboratorData>;
  impeditivos: Task[];
  activeTasks: Task[];
  deliveredThisWeek: Task[];
  hoursSummary: HoursSummary;
}

/** Rounds to 2 decimals to avoid floating-point artifacts (e.g. 6.0799999999999998) from summing hour fractions. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatMonthLabel(date: Date): string {
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getBusinessDaysInMonth(date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export function resolveHorasContratadasMes(
  settings: { horasContratadasDia?: number; horasContratadasMes?: number } | undefined,
  ref = new Date(),
): number | undefined {
  if (!settings) return undefined;
  if (settings.horasContratadasDia !== undefined && settings.horasContratadasDia !== null) {
    return Math.round(settings.horasContratadasDia * getBusinessDaysInMonth(ref) * 100) / 100;
  }
  return settings.horasContratadasMes;
}

function parseDateOnly(dateStr: string): Date | null {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function getWeekBounds(date = new Date()) {
  const ref = new Date(date);
  ref.setHours(0, 0, 0, 0);
  const day = ref.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(ref);
  start.setDate(ref.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getTaskDeliveryDate(task: Task): string | undefined {
  return task.dataConclusao?.trim() || task.dataEntrega?.trim() || undefined;
}

export function isTaskDeliveredThisWeek(task: Task, ref = new Date()): boolean {
  if (task.status !== "concluido") return false;
  const deliveryDate = getTaskDeliveryDate(task);
  if (!deliveryDate) return false;
  const date = parseDateOnly(deliveryDate);
  if (!date) return false;
  const { start, end } = getWeekBounds(ref);
  return date >= start && date <= end;
}

export function isTaskDeliveredThisMonth(task: Task, ref = new Date()): boolean {
  if (task.status !== "concluido") return false;
  const deliveryDate = getTaskDeliveryDate(task);
  if (!deliveryDate) return false;
  const date = parseDateOnly(deliveryDate);
  if (!date) return false;
  const { start, end } = getMonthBounds(ref);
  return date >= start && date <= end;
}

export function buildHoursSummary(
  tasks: Task[],
  horasContratadasMes: number | undefined,
  ref = new Date(),
): HoursSummary {
  const horasFeitas = round2(tasks
    .filter((t) => isTaskDeliveredThisMonth(t, ref))
    .reduce((sum, t) => sum + (t.tempoPrevisto ?? t.tempoEstimado ?? 0), 0));

  // Horas já alocadas em tarefas pendentes/em andamento (ainda não concluídas) —
  // representam compromisso já assumido, mesmo sem o trabalho ter terminado.
  const horasAlocadas = round2(tasks
    .filter((t) => t.status === "pendente" || t.status === "em_andamento")
    .reduce((sum, t) => sum + (t.tempoPrevisto ?? t.tempoEstimado ?? 0), 0));

  const horasComprometidas = round2(horasFeitas + horasAlocadas);

  if (horasContratadasMes === undefined || horasContratadasMes === null) {
    return { horasFeitas, horasAlocadas, horasComprometidas };
  }

  const horasRestantes = round2(Math.max(0, horasContratadasMes - horasComprometidas));
  const percentual = horasContratadasMes > 0 ? Math.round((horasComprometidas / horasContratadasMes) * 100) : 0;
  const alertLevel: HoursAlertLevel = percentual >= 100 ? "excedido" : percentual >= 85 ? "atencao" : "ok";

  return {
    horasContratadas: horasContratadasMes,
    horasFeitas,
    horasAlocadas,
    horasComprometidas,
    horasRestantes,
    percentual,
    alertLevel,
  };
}

export type HoursScopeState = "own" | "needs-selection" | "no-hours-configured" | "ready";

export interface ScopedHoursResult {
  summary: HoursSummary;
  state: HoursScopeState;
  scopeLabel?: string;
}

interface SubordinateHours {
  id: string;
  name: string;
  horasContratadasMes?: number;
  horasContratadasDia?: number;
}

/**
 * Resolves which hours summary to show for the "Horas contratadas" widget.
 * For a team leader, the widget must reflect a specific collaborator's own contracted
 * hours (never the manager's), so it requires an explicit collaboratorId selection.
 */
export function resolveScopedHours(params: {
  isTeamLeader: boolean;
  tasks: Task[];
  ownSettings?: { horasContratadasDia?: number; horasContratadasMes?: number };
  subordinates: SubordinateHours[];
  collaboratorId: string;
  ref?: Date;
}): ScopedHoursResult {
  const { isTeamLeader, tasks, ownSettings, subordinates, collaboratorId, ref } = params;

  if (!isTeamLeader) {
    const horasContratadasMes = resolveHorasContratadasMes(ownSettings, ref);
    const summary = buildHoursSummary(tasks, horasContratadasMes, ref);
    return { summary, state: "own" };
  }

  if (!collaboratorId) {
    return { summary: buildHoursSummary([], undefined, ref), state: "needs-selection" };
  }

  const collaborator = subordinates.find((s) => s.id === collaboratorId);
  const scopedTasks = tasks.filter((t) => t.assignedUserId === collaboratorId);
  const horasContratadasMes = resolveHorasContratadasMes(collaborator, ref);
  const summary = buildHoursSummary(scopedTasks, horasContratadasMes, ref);

  return {
    summary,
    state: horasContratadasMes === undefined ? "no-hours-configured" : "ready",
    scopeLabel: collaborator?.name,
  };
}

export function formatShortDate(dateStr?: string) {
  if (!dateStr?.trim()) return "—";
  const date = parseDateOnly(dateStr);
  if (!date) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function buildOperationalReportMetrics(
  tasks: Task[],
  horasContratadasMes?: number,
): OperationalReportMetrics {
  const total = tasks.length;
  const concluido = tasks.filter((t) => t.status === "concluido").length;
  const emAndamento = tasks.filter((t) => t.status === "em_andamento").length;
  const pendente = tasks.filter((t) => t.status === "pendente").length;
  const cancelado = tasks.filter((t) => t.status === "cancelado").length;
  const taxaConclusao = total > 0 ? Math.round((concluido / total) * 100) : 0;
  const totalEstimado = round2(tasks.reduce((s, t) => s + (t.tempoEstimado ?? 0), 0));
  const totalPrevisto = round2(tasks.reduce((s, t) => s + (t.tempoPrevisto ?? 0), 0));
  const comImpeditivo = tasks.filter((t) => t.impeditivo?.trim()).length;

  const statusBreakdown = (["concluido", "em_andamento", "pendente", "cancelado"] as const)
    .map((status) => {
      const value = tasks.filter((t) => t.status === status).length;
      return {
        label: STATUS_LABELS[status],
        value,
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
      };
    })
    .filter((s) => s.value > 0);

  return {
    total,
    concluido,
    emAndamento,
    pendente,
    cancelado,
    taxaConclusao,
    totalEstimado,
    totalPrevisto,
    comImpeditivo,
    statusBreakdown,
    projectSummary: buildProjectData(tasks),
    collaboratorSummary: buildCollaboratorData(tasks),
    impeditivos: tasks.filter((t) => t.impeditivo?.trim()),
    activeTasks: tasks.filter((t) => t.status === "em_andamento" || t.status === "pendente"),
    deliveredThisWeek: tasks.filter((t) => isTaskDeliveredThisWeek(t)),
    hoursSummary: buildHoursSummary(tasks, horasContratadasMes),
  };
}

export function formatReportDate(date = new Date()) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatReportFileDate(date = new Date()) {
  return date.toISOString().split("T")[0];
}

export function buildReportFilenames(prefix = "report-operacional") {
  const date = formatReportFileDate();
  return {
    excel: `${prefix}-tarefas_${date}.xlsx`,
    pdfIndicadores: `${prefix}-indicadores_${date}.pdf`,
    pdfRelatorio: `${prefix}-relatorio_${date}.pdf`,
    eml: `${prefix}_${date}.eml`,
  };
}

function buildHoursEmailLines(hours: HoursSummary): string[] {
  if (hours.horasContratadas === undefined) return [];
  const alertText =
    hours.alertLevel === "excedido"
      ? " ⚠ horas contratadas ultrapassadas"
      : hours.alertLevel === "atencao"
        ? " ⚠ perto do limite mensal"
        : "";
  return [
    `• Horas do mês: ${hours.horasFeitas}h feitas + ${hours.horasAlocadas}h alocadas em tarefas abertas = ${hours.horasComprometidas}h de ${hours.horasContratadas}h contratadas (restam ${hours.horasRestantes}h)${alertText}`,
  ];
}

export function buildEmailSubject(context: OperationalReportContext, date = new Date()) {
  const dateStr = date.toLocaleDateString("pt-BR");
  return `Report Operacional — ${context.reporterName} — ${dateStr}`;
}

export function buildEmailBody(
  context: OperationalReportContext,
  metrics: OperationalReportMetrics,
  filenames: ReturnType<typeof buildReportFilenames>,
  date = new Date(),
) {
  const greeting = context.managerName ? `Olá, ${context.managerName},` : "Olá,";
  const dateStr = formatReportDate(date);

  return [
    greeting,
    "",
    `Segue o meu report operacional, referente a ${dateStr}.`,
    "",
    "Resumo dos indicadores:",
    `• Total de tarefas: ${metrics.total}`,
    `• Concluídas: ${metrics.concluido} (${metrics.taxaConclusao}%)`,
    `• Em andamento: ${metrics.emAndamento}`,
    `• Pendentes: ${metrics.pendente}`,
    `• Com impeditivo: ${metrics.comImpeditivo}`,
    `• Horas estimadas: ${metrics.totalEstimado}h | previstas: ${metrics.totalPrevisto}h`,
    ...buildHoursEmailLines(metrics.hoursSummary),
    "",
    "Anexos incluídos neste e-mail:",
    `• ${filenames.excel} — detalhamento completo das tarefas (Excel estilizado)`,
    `• ${filenames.pdfIndicadores} — indicadores e números consolidados`,
    `• ${filenames.pdfRelatorio} — visão geral com gráficos e tabela de relatórios`,
    "",
    "Atenciosamente,",
  ].join("\r\n");
}

const EMAIL_FONT = "'Aptos','Segoe UI',Helvetica,sans-serif";
const EMAIL_BASE = `font-family:${EMAIL_FONT};font-size:12pt;color:#000000;line-height:1.35;mso-line-height-rule:exactly;`;

function htmlP(extra = "") {
  return `<p style="margin:0 0 2px;${EMAIL_BASE}${extra}">`;
}

function htmlSection() {
  return `<p style="margin:10px 0 3px;${EMAIL_BASE}">`;
}

function htmlLi(text: string) {
  return `<li style="margin:0 0 1px;${EMAIL_BASE}">${text}</li>`;
}

function esc(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEmailHtmlBody(
  context: OperationalReportContext,
  metrics: OperationalReportMetrics,
  filenames: ReturnType<typeof buildReportFilenames>,
  date = new Date(),
) {
  const greeting = context.managerName ? `Olá, ${context.managerName},` : "Olá,";
  const dateStr = formatReportDate(date);

  const indicatorItems = [
    `Total de tarefas: ${metrics.total}`,
    `Concluídas: ${metrics.concluido} (${metrics.taxaConclusao}%)`,
    `Em andamento: ${metrics.emAndamento}`,
    `Pendentes: ${metrics.pendente}`,
    `Com impeditivo: ${metrics.comImpeditivo}`,
    `Horas estimadas: ${metrics.totalEstimado}h | previstas: ${metrics.totalPrevisto}h`,
    ...buildHoursEmailLines(metrics.hoursSummary).map((line) => line.replace(/^•\s*/, "")),
  ];

  const attachmentItems = [
    `${esc(filenames.excel)} — detalhamento completo das tarefas (Excel estilizado)`,
    `${esc(filenames.pdfIndicadores)} — indicadores e números consolidados`,
    `${esc(filenames.pdfRelatorio)} — visão geral com gráficos e tabela de relatórios`,
  ];

  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    "<!--[if mso]>",
    `<style>body,p,li,ul{font-family:Aptos,sans-serif;font-size:12pt;}</style>`,
    "<![endif]-->",
    "</head>",
    `<body lang="PT-BR" style="margin:0;padding:0;${EMAIL_BASE}">`,
    `${htmlP()}${esc(greeting)}</p>`,
    `${htmlP()}${esc(`Segue o meu report operacional, referente a ${dateStr}.`)}</p>`,
    `${htmlSection()}Resumo dos indicadores:</p>`,
    `<ul style="margin:0 0 4px 20px;padding:0;${EMAIL_BASE}">`,
    ...indicatorItems.map((item) => htmlLi(esc(item))),
    "</ul>",
    `${htmlSection()}Anexos incluídos neste e-mail:</p>`,
    `<ul style="margin:0 0 4px 20px;padding:0;${EMAIL_BASE}">`,
    ...attachmentItems.map((item) => htmlLi(item)),
    "</ul>",
    `${htmlSection()}Atenciosamente,</p>`,
    `<p style="margin:0;${EMAIL_BASE}"><br></p>`,
    "</body></html>",
  ].join("");
}
