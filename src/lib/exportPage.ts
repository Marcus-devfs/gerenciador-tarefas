import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

async function captureElement(element: HTMLElement) {
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#f8fafc",
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });
}

export async function exportToPng(element: HTMLElement, filename: string) {
  const canvas = await captureElement(element);
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function buildPdfFromCanvas(canvas: HTMLCanvasElement) {
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;

  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    pdf.addPage();
    position = margin - (imgHeight - heightLeft);
    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  return pdf;
}

export async function exportToPdfBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await captureElement(element);
  return buildPdfFromCanvas(canvas).output("blob");
}

export async function exportToPdf(element: HTMLElement, filename: string) {
  const canvas = await captureElement(element);
  buildPdfFromCanvas(canvas).save(`${filename}.pdf`);
}
