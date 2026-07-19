"use client";

import { useState } from "react";
import { ExternalLink, Loader2, Mail, Send } from "lucide-react";
import Link from "next/link";
import type { Task } from "@/types";
import { buildOperationalEml } from "@/lib/buildOperationalEml";
import { exportOperationalExcel } from "@/lib/exportOperationalExcel";
import { exportOperationalPdf } from "@/lib/exportOperationalPdf";
import { exportToPdfBlob } from "@/lib/exportPage";
import {
  buildEmailBody,
  buildEmailHtmlBody,
  buildEmailSubject,
  buildOperationalReportMetrics,
  buildReportFilenames,
  type OperationalReportContext,
} from "@/lib/operationalReportMetrics";
import { deliverOutlookClassicEml, tryShareFiles } from "@/lib/operationalReportDelivery";

interface Props {
  tasks: Task[];
  exportRef: React.RefObject<HTMLElement | null>;
  reporterName: string;
  reporterEmail: string;
  managerEmail?: string;
  managerName?: string;
  horasContratadasMes?: number;
}

type Step = "idle" | "excel" | "pdf-indicadores" | "pdf-relatorio" | "eml" | "email" | "done";

const STEP_LABELS: Record<Exclude<Step, "idle" | "done">, string> = {
  excel: "Gerando Excel estilizado…",
  "pdf-indicadores": "Gerando PDF de indicadores…",
  "pdf-relatorio": "Capturando relatório visual…",
  eml: "Montando e-mail com anexos…",
  email: "Abrindo Outlook Classic…",
};

export default function OperationalReportButton({
  tasks,
  exportRef,
  reporterName,
  reporterEmail,
  managerEmail,
  managerName,
  horasContratadasMes,
}: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emlUrl, setEmlUrl] = useState<string | null>(null);
  const [emlFilename, setEmlFilename] = useState<string | null>(null);

  const hasManager = Boolean(managerEmail?.trim());
  const isLoading = step !== "idle" && step !== "done";

  async function handleSendReport() {
    setError(null);
    setMessage(null);
    if (emlUrl) URL.revokeObjectURL(emlUrl);
    setEmlUrl(null);
    setEmlFilename(null);

    const context: OperationalReportContext = {
      reporterName,
      reporterEmail,
      managerEmail: managerEmail?.trim(),
      managerName: managerName?.trim(),
    };

    try {
      const metrics = buildOperationalReportMetrics(tasks, horasContratadasMes);
      const filenames = buildReportFilenames();

      setStep("excel");
      const excelBlob = await exportOperationalExcel(tasks, metrics, context);

      setStep("pdf-indicadores");
      const pdfIndicadoresBlob = exportOperationalPdf(metrics, context);

      setStep("pdf-relatorio");
      if (!exportRef.current) {
        throw new Error("Conteúdo do relatório não disponível para captura.");
      }
      const pdfRelatorioBlob = await exportToPdfBlob(exportRef.current);

      const subject = buildEmailSubject(context);
      const body = buildEmailBody(context, metrics, filenames);
      const htmlBody = buildEmailHtmlBody(context, metrics, filenames);
      const files = [
        new File([excelBlob], filenames.excel, {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        new File([pdfIndicadoresBlob], filenames.pdfIndicadores, { type: "application/pdf" }),
        new File([pdfRelatorioBlob], filenames.pdfRelatorio, { type: "application/pdf" }),
      ];

      setStep("eml");
      const emlBlob = await buildOperationalEml({
        fromEmail: reporterEmail,
        fromName: reporterName,
        toEmail: context.managerEmail,
        subject,
        body,
        htmlBody,
        attachments: [
          { filename: filenames.excel, blob: excelBlob },
          { filename: filenames.pdfIndicadores, blob: pdfIndicadoresBlob },
          { filename: filenames.pdfRelatorio, blob: pdfRelatorioBlob },
        ],
      });

      setStep("email");
      const shared = await tryShareFiles(files, subject, body);

      if (!shared) {
        deliverOutlookClassicEml(emlBlob, filenames.eml);
        const url = URL.createObjectURL(emlBlob);
        setEmlUrl(url);
        setEmlFilename(filenames.eml);
      }

      setStep("done");

      if (shared) {
        setMessage("Arquivos gerados e compartilhados com anexos via sistema.");
      } else if (hasManager) {
        setMessage(
          "Arquivo .eml baixado. Abra no Outlook Classic (duplo clique) — deve abrir para edição e envio. Insira sua assinatura após \"Atenciosamente,\".",
        );
      } else {
        setMessage(
          "Arquivo .eml baixado. Configure o gestor em Configurações. Abra no Outlook para editar, inserir assinatura e enviar.",
        );
      }
    } catch (err) {
      console.error("[operational-report]", err);
      setError("Falha ao gerar o report operacional. Tente novamente.");
      setStep("idle");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
  

      {!hasManager && step === "idle" && (
        <p className="text-[11px] text-amber-600 flex items-center gap-1">
          <Mail size={11} />
          <span>
            Defina seu gestor em{" "}
            <Link href="/configuracoes" className="underline hover:text-amber-700">
              Configurações
            </Link>
          </span>
        </p>
      )}

      {emlUrl && emlFilename && (
        <a
          href={emlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-600 hover:text-brand-700 underline"
        >
          <ExternalLink size={11} />
          Abrir no Outlook Classic
        </a>
      )}

      {message && (
        <p className="text-[11px] text-brand-600 max-w-[300px] text-right leading-snug">{message}</p>
      )}
      {error && (
        <p className="text-[11px] text-red-500 max-w-[300px] text-right">{error}</p>
      )}

<button
        onClick={handleSendReport}
        disabled={isLoading || tasks.length === 0}
        title={tasks.length === 0 ? "Nenhuma tarefa para exportar" : undefined}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
      >
        {isLoading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Send size={15} />
        )}
        {isLoading ? STEP_LABELS[step as keyof typeof STEP_LABELS] ?? "Processando…" : "Enviar report operacional"}
      </button>
    </div>
  );
}
