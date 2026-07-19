"use client";

import { useState } from "react";
import { Download, FileImage, FileText, Loader2 } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { exportToPdf, exportToPng } from "@/lib/exportPage";
import type { Task } from "@/types";

interface Props {
  tasks: Task[];
  exportRef: React.RefObject<HTMLElement | null>;
  filenamePrefix?: string;
}

export default function ExportButtons({ tasks, exportRef, filenamePrefix = "relatorio" }: Props) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const date = new Date().toISOString().split("T")[0];
  const filename = `${filenamePrefix}_${date}`;

  async function run(type: "excel" | "pdf" | "png") {
    setExporting(type);
    setError(null);
    try {
      if (type === "excel") {
        exportToExcel(tasks, filename);
      } else if (exportRef.current) {
        if (type === "pdf") await exportToPdf(exportRef.current, filename);
        else await exportToPng(exportRef.current, filename);
      } else {
        setError("Conteúdo não disponível para exportação.");
      }
    } catch (err) {
      console.error("[export]", err);
      setError("Falha ao exportar. Tente novamente.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => run("excel")}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
      >
        {exporting === "excel" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        Excel
      </button>
      <button
        onClick={() => run("pdf")}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-surface-200 hover:bg-surface-50 text-surface-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
      >
        {exporting === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        PDF
      </button>
      <button
        onClick={() => run("png")}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-surface-200 hover:bg-surface-50 text-surface-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
      >
        {exporting === "png" ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
        Imagem
      </button>
    </div>
    {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
