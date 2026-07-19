interface EmlAttachment {
  filename: string;
  blob: Blob;
}

interface BuildEmlOptions {
  fromEmail: string;
  fromName: string;
  toEmail?: string;
  subject: string;
  body: string;
  htmlBody: string;
  attachments: EmlAttachment[];
}

const CRLF = "\r\n";

function encodeMimeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const encoded = btoa(
    encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    ),
  );
  return `=?UTF-8?B?${encoded}?=`;
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function blobToBase64Lines(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return wrapBase64(btoa(binary));
}

function wrapBase64(base64: string): string {
  return base64.match(/.{1,76}/g)?.join(CRLF) ?? base64;
}

function mimeTypeFor(filename: string): string {
  if (filename.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (filename.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export async function buildOperationalEml(options: BuildEmlOptions): Promise<Blob> {
  const outerBoundary = `----=_Report_${Date.now()}`;
  const altBoundary = `----=_Alt_${Date.now() + 1}`;
  const plainBody = options.body.replace(/\n/g, CRLF);
  const htmlBody = options.htmlBody;
  const hasAttachments = options.attachments.length > 0;
  const parts: string[] = [];

  parts.push(`From: ${encodeMimeHeader(options.fromName)} <${options.fromEmail}>`);
  if (options.toEmail) parts.push(`To: ${options.toEmail}`);
  parts.push(`Subject: ${encodeMimeHeader(options.subject)}`);
  parts.push("X-Unsent: 1");
  parts.push("Content-Class: urn:content-classes:message");
  if (hasAttachments) parts.push("X-MS-Has-Attach: yes");
  parts.push("MIME-Version: 1.0");
  parts.push(`Content-Type: multipart/mixed; boundary="${outerBoundary}"`);
  parts.push("");

  // Corpo em plain + HTML — Outlook usa HTML e preserva assinatura com imagens
  parts.push(`--${outerBoundary}`);
  parts.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  parts.push("");

  parts.push(`--${altBoundary}`);
  parts.push("Content-Type: text/plain; charset=UTF-8");
  parts.push("Content-Transfer-Encoding: base64");
  parts.push("");
  parts.push(encodeBase64Utf8(plainBody));
  parts.push("");

  parts.push(`--${altBoundary}`);
  parts.push("Content-Type: text/html; charset=UTF-8");
  parts.push("Content-Transfer-Encoding: base64");
  parts.push("");
  parts.push(encodeBase64Utf8(htmlBody));
  parts.push("");

  parts.push(`--${altBoundary}--`);
  parts.push("");

  for (const attachment of options.attachments) {
    const base64 = await blobToBase64Lines(attachment.blob);
    parts.push(`--${outerBoundary}`);
    parts.push(`Content-Type: ${mimeTypeFor(attachment.filename)}; name="${attachment.filename}"`);
    parts.push("Content-Transfer-Encoding: base64");
    parts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
    parts.push("");
    parts.push(base64);
    parts.push("");
  }

  parts.push(`--${outerBoundary}--`);
  parts.push("");

  return new Blob([parts.join(CRLF)], { type: "message/rfc822" });
}
