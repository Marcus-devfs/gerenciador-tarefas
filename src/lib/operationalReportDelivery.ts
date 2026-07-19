export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function tryShareFiles(
  files: File[], 
  title: string,
  text: string,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) {
    return false;
  }

  const payload = { files, title, text };
  if (!navigator.canShare(payload)) return false;

  try {
    await navigator.share(payload);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return true;
    return false;
  }
}

/**
 * Entrega o e-mail via arquivo .eml — compatível com Outlook Classic no Windows.
 * O .eml inclui destinatário, assunto, corpo e anexos embutidos.
 */
export function deliverOutlookClassicEml(emlBlob: Blob, filename: string) {
  downloadBlob(emlBlob, filename);

  const url = URL.createObjectURL(emlBlob);
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
