import { jsPDF } from "jspdf";
import type { OperationalReportContext, OperationalReportMetrics } from "@/lib/operationalReportMetrics";
import { formatReportDate, formatShortDate, getTaskDeliveryDate } from "@/lib/operationalReportMetrics";

const BRAND: [number, number, number] = [243, 149, 25];
const TEXT: [number, number, number] = [51, 65, 85];
const MUTED: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [226, 232, 240];

function drawSectionTitle(pdf: jsPDF, title: string, y: number) {
  pdf.setFillColor(...BRAND);
  pdf.roundedRect(14, y, 182, 8, 1.5, 1.5, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(title, 18, y + 5.5);
  return y + 12;
}

function drawKpiGrid(pdf: jsPDF, metrics: OperationalReportMetrics, startY: number) {
  const { hoursSummary } = metrics;
  const restantesColor: [number, number, number] =
    hoursSummary.alertLevel === "excedido"
      ? [220, 38, 38]
      : hoursSummary.alertLevel === "atencao"
        ? [217, 119, 6]
        : BRAND;

  const kpis: { label: string; value: string; color?: [number, number, number] }[] = [
    { label: "Total", value: String(metrics.total) },
    { label: "Concluídas", value: `${metrics.concluido} (${metrics.taxaConclusao}%)` },
    { label: "Em andamento", value: String(metrics.emAndamento) },
    { label: "Pendentes", value: String(metrics.pendente) },
    { label: "Canceladas", value: String(metrics.cancelado) },
    { label: "Impeditivos", value: String(metrics.comImpeditivo) },
    { label: "Horas est.", value: `${metrics.totalEstimado}h` },
    { label: "Horas prev.", value: `${metrics.totalPrevisto}h` },
    ...(hoursSummary.horasContratadas !== undefined
      ? [
          { label: "Horas contratadas (mês)", value: `${hoursSummary.horasContratadas}h` },
          { label: "Horas feitas (mês)", value: `${hoursSummary.horasFeitas}h` },
          { label: "Horas restantes (mês)", value: `${hoursSummary.horasRestantes}h`, color: restantesColor },
        ]
      : []),
  ];

  const cols = 4;
  const cellW = 44;
  const cellH = 16;
  let x = 14;
  let y = startY;

  kpis.forEach((kpi, i) => {
    if (i > 0 && i % cols === 0) {
      x = 14;
      y += cellH + 2;
    }

    pdf.setDrawColor(...BORDER);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, cellW, cellH, 2, 2, "FD");

    pdf.setTextColor(...MUTED);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(kpi.label, x + 3, y + 5);

    pdf.setTextColor(...(kpi.color ?? BRAND));
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(kpi.value, x + 3, y + 12);

    x += cellW + 2;
  });

  return y + cellH + 8;
}

function drawTable(
  pdf: jsPDF,
  headers: string[],
  rows: string[][],
  startY: number,
  colWidths: number[],
): number {
  let y = startY;
  const rowH = 7;
  const startX = 14;

  pdf.setFillColor(...BRAND);
  pdf.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);

  let x = startX + 2;
  headers.forEach((h, i) => {
    pdf.text(h, x, y + 5);
    x += colWidths[i];
  });
  y += rowH;

  rows.forEach((row, idx) => {
    if (y > 275) {
      pdf.addPage();
      y = 20;
    }

    const fill: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    pdf.setFillColor(...fill);
    pdf.setDrawColor(...BORDER);
    pdf.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH, "FD");

    pdf.setTextColor(...TEXT);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);

    x = startX + 2;
    row.forEach((cell, i) => {
      const truncated = cell.length > Math.floor(colWidths[i] / 1.8)
        ? cell.slice(0, Math.floor(colWidths[i] / 1.8)) + "…"
        : cell;
      pdf.text(truncated, x, y + 5);
      x += colWidths[i];
    });
    y += rowH;
  });

  return y + 6;
}

export function exportOperationalPdf(
  metrics: OperationalReportMetrics,
  context: OperationalReportContext,
): Blob {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  pdf.setFillColor(...BRAND);
  pdf.rect(0, 0, 210, 28, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Report Operacional", 14, 14);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`${context.reporterName} · ${formatReportDate()}`, 14, 21);

  let y = 36;

  y = drawSectionTitle(pdf, "Indicadores consolidados", y);
  y = drawKpiGrid(pdf, metrics, y);

  if (metrics.statusBreakdown.length > 0) {
    y = drawSectionTitle(pdf, "Distribuição por status", y);
    y = drawTable(
      pdf,
      ["Status", "Quantidade", "%"],
      metrics.statusBreakdown.map((s) => [s.label, String(s.value), `${s.pct}%`]),
      y,
      [80, 40, 30],
    );
  }

  if (metrics.projectSummary.length > 0) {
    if (y > 230) { pdf.addPage(); y = 20; }
    y = drawSectionTitle(pdf, "Tarefas por projeto", y);
    y = drawTable(
      pdf,
      ["Projeto", "Pend.", "Andam.", "Concl."],
      metrics.projectSummary.map((p) => [
        p.name,
        String(p.pendente),
        String(p.em_andamento),
        String(p.concluido),
      ]),
      y,
      [80, 25, 25, 25],
    );
  }

  if (metrics.collaboratorSummary.length > 0) {
    if (y > 230) { pdf.addPage(); y = 20; }
    y = drawSectionTitle(pdf, "Tarefas por colaborador", y);
    y = drawTable(
      pdf,
      ["Colaborador", "Total", "Concl.", "Andam.", "Pend."],
      metrics.collaboratorSummary.map((c) => [
        c.name,
        String(c.total),
        String(c.concluido),
        String(c.em_andamento),
        String(c.pendente),
      ]),
      y,
      [60, 20, 20, 25, 20],
    );
  }

  if (metrics.impeditivos.length > 0) {
    if (y > 220) { pdf.addPage(); y = 20; }
    y = drawSectionTitle(pdf, "Tarefas com impeditivo", y);
    y = drawTable(
      pdf,
      ["Título", "Responsável", "Impeditivo"],
      metrics.impeditivos.slice(0, 12).map((t) => [
        t.title,
        t.assignedToName,
        t.impeditivo ?? "",
      ]),
      y,
      [55, 35, 70],
    );
  }

  if (metrics.activeTasks.length > 0) {
    if (y > 220) { pdf.addPage(); y = 20; }
    y = drawSectionTitle(pdf, "Tarefas ativas (pendentes e em andamento)", y);
    y = drawTable(
      pdf,
      ["Título", "Status", "Projeto", "Progresso"],
      metrics.activeTasks.slice(0, 15).map((t) => [
        t.title,
        t.status === "em_andamento" ? "Em andamento" : "Pendente",
        t.projeto ?? "—",
        `${t.progress}%`,
      ]),
      y,
      [70, 30, 40, 25],
    );
  }

  if (metrics.deliveredThisWeek.length > 0) {
    if (y > 220) { pdf.addPage(); y = 20; }
    y = drawSectionTitle(pdf, "Tarefas entregues essa semana", y);
    y = drawTable(
      pdf,
      ["Título", "Projeto", "Entrega"],
      metrics.deliveredThisWeek.slice(0, 15).map((t) => [
        t.title,
        t.projeto ?? "—",
        formatShortDate(getTaskDeliveryDate(t)),
      ]),
      y,
      [85, 50, 25],
    );
  }

  pdf.setTextColor(...MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(
    `Gerado automaticamente por Acompanhamento de Tarefas · ${context.reporterEmail}`,
    14,
    290,
  );

  return pdf.output("blob");
}
