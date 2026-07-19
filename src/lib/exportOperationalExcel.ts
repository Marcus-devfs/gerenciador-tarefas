import type { Task } from "@/types";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/types";
import type { OperationalReportContext, OperationalReportMetrics } from "@/lib/operationalReportMetrics";
import { formatReportDate } from "@/lib/operationalReportMetrics";

const BRAND = "FFF39519";
const BRAND_LIGHT = "FFFEF6EC";
const HEADER_TEXT = "FFFFFFFF";
const ALT_ROW = "FFF8FAFC";
const BORDER = "FFE2E8F0";

const STATUS_COLORS: Record<string, string> = {
  Pendente: "FFF1F5F9",
  "Em andamento": "FFDBEAFE",
  Concluído: "FFFEF6EC",
  Cancelado: "FFFEE2E2",
};

const PRIORITY_COLORS: Record<string, string> = {
  Alta: "FFFEE2E2",
  Média: "FFFEF3C7",
  Baixa: "FFF1F5F9",
};

function styleHeaderRow(row: import("exceljs").Row, colCount: number) {
  row.height = 22;
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BRAND } },
      bottom: { style: "thin", color: { argb: BRAND } },
      left: { style: "thin", color: { argb: BRAND } },
      right: { style: "thin", color: { argb: BRAND } },
    };
  }
}

function styleDataCell(cell: import("exceljs").Cell, alt: boolean) {
  cell.font = { size: 10, color: { argb: "FF334155" } };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: alt ? ALT_ROW : "FFFFFFFF" },
  };
  cell.border = {
    top: { style: "thin", color: { argb: BORDER } },
    bottom: { style: "thin", color: { argb: BORDER } },
    left: { style: "thin", color: { argb: BORDER } },
    right: { style: "thin", color: { argb: BORDER } },
  };
}

export async function exportOperationalExcel(
  tasks: Task[],
  metrics: OperationalReportMetrics,
  context: OperationalReportContext,
): Promise<Blob> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = context.reporterName;
  wb.created = new Date();

  // ── Sheet 1: Resumo ──
  const summary = wb.addWorksheet("Resumo", {
    views: [{ showGridLines: false }],
    properties: { defaultColWidth: 16 },
  });

  summary.mergeCells("A1:F1");
  const titleCell = summary.getCell("A1");
  titleCell.value = "Report Operacional de Tarefas";
  titleCell.font = { bold: true, size: 16, color: { argb: HEADER_TEXT } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  summary.getRow(1).height = 32;

  summary.mergeCells("A2:F2");
  const subCell = summary.getCell("A2");
  subCell.value = `${context.reporterName} · ${formatReportDate()}`;
  subCell.font = { size: 11, color: { argb: "FF475569" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_LIGHT } };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  summary.getRow(2).height = 22;

  const kpis = [
    ["Indicador", "Valor"],
    ["Total de tarefas", metrics.total],
    ["Concluídas", `${metrics.concluido} (${metrics.taxaConclusao}%)`],
    ["Em andamento", metrics.emAndamento],
    ["Pendentes", metrics.pendente],
    ["Canceladas", metrics.cancelado],
    ["Com impeditivo", metrics.comImpeditivo],
    ["Horas estimadas", `${metrics.totalEstimado}h`],
    ["Horas previstas", `${metrics.totalPrevisto}h`],
    ...(metrics.hoursSummary.horasContratadas !== undefined
      ? ([
          ["Horas contratadas (mês)", `${metrics.hoursSummary.horasContratadas}h`],
          ["Horas feitas (mês)", `${metrics.hoursSummary.horasFeitas}h`],
          ["Horas restantes (mês)", `${metrics.hoursSummary.horasRestantes}h`],
        ] as [string, string][])
      : []),
  ];

  summary.addRow([]);
  const kpiStart = 4;
  kpis.forEach((row, idx) => {
    const r = summary.getRow(kpiStart + idx);
    r.getCell(1).value = row[0];
    r.getCell(2).value = row[1];
    if (idx === 0) {
      styleHeaderRow(r, 2);
    } else {
      styleDataCell(r.getCell(1), idx % 2 === 0);
      styleDataCell(r.getCell(2), idx % 2 === 0);
      r.getCell(2).alignment = { vertical: "middle", horizontal: "center" };
      const isHoursRestantes = row[0] === "Horas restantes (mês)";
      const alertColor =
        isHoursRestantes && metrics.hoursSummary.alertLevel === "excedido"
          ? "FFDC2626"
          : isHoursRestantes && metrics.hoursSummary.alertLevel === "atencao"
            ? "FFD97706"
            : BRAND;
      r.getCell(2).font = { bold: true, size: 10, color: { argb: alertColor } };
    }
    r.height = 20;
  });

  summary.getColumn(1).width = 28;
  summary.getColumn(2).width = 22;

  // ── Sheet 2: Tarefas ──
  const headers = [
    "Título", "Responsável", "Projeto", "Status", "Prioridade",
    "Situação Atual", "Impeditivo", "Prazo", "Entrega", "Conclusão",
    "T.Est (h)", "T.Prev (h)", "Progresso (%)",
  ];

  const ws = wb.addWorksheet("Tarefas", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.addRow(headers);
  styleHeaderRow(ws.getRow(1), headers.length);

  tasks.forEach((t, idx) => {
    const statusLabel = STATUS_LABELS[t.status];
    const priorityLabel = PRIORITY_LABELS[t.priority];
    const row = ws.addRow([
      t.title,
      t.assignedToName,
      t.projeto ?? "",
      statusLabel,
      priorityLabel,
      t.situacaoAtual ?? "",
      t.impeditivo ?? "",
      t.dueDate ?? "",
      t.dataEntrega ?? "",
      t.dataConclusao ?? "",
      t.tempoEstimado ?? "",
      t.tempoPrevisto ?? "",
      t.progress,
    ]);

    row.height = 18;
    const alt = idx % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      styleDataCell(cell, alt);
      if (colNumber === 4 && STATUS_COLORS[statusLabel]) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_COLORS[statusLabel] } };
      }
      if (colNumber === 5 && PRIORITY_COLORS[priorityLabel]) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIORITY_COLORS[priorityLabel] } };
      }
      if (colNumber === 7 && t.impeditivo?.trim()) {
        cell.font = { size: 10, color: { argb: "FFB45309" }, bold: true };
      }
    });
  });

  ws.columns = [
    { width: 42 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 12 },
    { width: 40 }, { width: 35 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 10 }, { width: 10 }, { width: 12 },
  ];

  // ── Sheet 3: Por Colaborador ──
  const wsColab = wb.addWorksheet("Por Colaborador", { views: [{ state: "frozen", ySplit: 1 }] });
  const colabHeaders = ["Colaborador", "Total", "Concluídas", "Em Andamento", "Pendentes", "Taxa (%)"];
  wsColab.addRow(colabHeaders);
  styleHeaderRow(wsColab.getRow(1), colabHeaders.length);

  metrics.collaboratorSummary.forEach((c, idx) => {
    const taxa = c.total > 0 ? Math.round((c.concluido / c.total) * 100) : 0;
    const row = wsColab.addRow([c.name, c.total, c.concluido, c.em_andamento, c.pendente, taxa]);
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (cell) => styleDataCell(cell, idx % 2 === 1));
  });
  wsColab.columns = [{ width: 24 }, { width: 10 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }];

  // ── Sheet 4: Por Projeto ──
  const wsProj = wb.addWorksheet("Por Projeto", { views: [{ state: "frozen", ySplit: 1 }] });
  const projHeaders = ["Projeto", "Pendente", "Em Andamento", "Concluído"];
  wsProj.addRow(projHeaders);
  styleHeaderRow(wsProj.getRow(1), projHeaders.length);

  metrics.projectSummary.forEach((p, idx) => {
    const row = wsProj.addRow([p.name, p.pendente, p.em_andamento, p.concluido]);
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (cell) => styleDataCell(cell, idx % 2 === 1));
  });
  wsProj.columns = [{ width: 28 }, { width: 12 }, { width: 14 }, { width: 12 }];

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
