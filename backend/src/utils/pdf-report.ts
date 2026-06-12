import PDFDocument from "pdfkit";
import { put } from "@vercel/blob";
import { prisma } from "../lib/prisma";
import { decryptField } from "./encryption";
import path from "path";
import fs from "fs";
import sharp from "sharp";

// ── Layout constants ────────────────────────────────────────────────────────
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const CW = PAGE_W - MARGIN * 2; // 540
const BOTTOM = PAGE_H - MARGIN; // 756
const DARK = "#4D4D4D";
const BORDER = "#AAAAAA";
const HDR_H = 17;
const ROW_H = 22;

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function parseImageUrls(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const p = JSON.parse(value);
    return Array.isArray(p) ? p : [value];
  } catch {
    return [value];
  }
}

async function fetchBuf(url: string): Promise<Buffer | null> {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Fetch a remote image and normalise it to a plain sRGB PNG so PDFKit
 * renders colours correctly regardless of the original colour profile.
 * Also auto-rotates based on EXIF metadata (phone photos) and caps
 * resolution so the PDF doesn't bloat.
 */
async function fetchImage(url: string): Promise<Buffer | null> {
  const raw = await fetchBuf(url);
  if (!raw) return null;
  try {
    return await sharp(raw)
      .rotate()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .toColorspace("srgb")
      .png()
      .toBuffer();
  } catch {
    return raw;
  }
}

async function fileImage(filePath: string): Promise<Buffer | null> {
  try {
    const raw = fs.readFileSync(filePath);
    return await sharp(raw)
      .rotate()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .toColorspace("srgb")
      .png()
      .toBuffer();
  } catch {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
  }
}

type Doc = InstanceType<typeof PDFDocument>;

/** Dark-gray section header bar; returns next Y */
function secHdr(doc: Doc, label: string, y: number): number {
  doc.rect(MARGIN, y, CW, HDR_H).fill(DARK);
  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(label.toUpperCase(), MARGIN, y + 4, {
      width: CW,
      align: "center",
      lineBreak: false,
    });
  doc.fillColor("black");
  return y + HDR_H;
}

/** Bordered table row; returns next Y */
function tRow(
  doc: Doc,
  cells: { label: string; value: string; w: number }[],
  y: number,
  h = ROW_H,
): number {
  let x = MARGIN;
  for (const c of cells) {
    doc.rect(x, y, c.w, h).stroke(BORDER);
    const ty = y + Math.max(3, (h - 7) / 2);

    if (c.label) {
      const lStr = `${c.label}: `;
      doc.font("Helvetica-Bold").fontSize(7).fillColor("#444444");
      const lW = doc.widthOfString(lStr);
      doc.text(lStr, x + 4, ty, { lineBreak: false, width: lW + 1 });
      doc
        .font("Helvetica")
        .fillColor("#000000")
        .text(c.value || "—", x + 4 + lW, ty, {
          lineBreak: false,
          width: Math.max(1, c.w - 8 - lW),
          ellipsis: true,
        });
    } else {
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor("#000000")
        .text(c.value || "", x + 4, ty, {
          lineBreak: false,
          width: c.w - 8,
          ellipsis: true,
        });
    }
    x += c.w;
  }
  return y + h;
}

/** Add a page if the remaining space is less than `needed` */
function guardPage(doc: Doc, y: number, needed: number): number {
  if (y + needed > BOTTOM) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function generateTicketPdf(ticketId: string): Promise<string | null> {
  try {
    // Fetch all data the PDF needs
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        company: true,
        client: true,
        branch: true,
        equipment: true,
        technician: { select: { name: true } },
        report: {
          include: {
            template: {
              include: { fields: { orderBy: { order: "asc" } } },
            },
            spareParts: {
              include: { inventoryItem: true },
            },
          },
        },
      },
    });

    if (!ticket?.report) return null;

    const { company, client, branch, equipment, report, technician } = ticket;
    const template = report.template as {
      fields: { id: string; label: string; type: string }[];
    } | null;
    const responses = (report.responses ?? {}) as Record<string, string>;

    // Decrypt encrypted client fields
    const clientEmail = decryptField(client.contactEmail) ?? "—";
    const clientPhone = decryptField(client.contactPhone) ?? "—";
    const clientAddress = decryptField(client.address) ?? "—";

    // Resolve logo: company logo → deployr fallback
    let logoBuf: Buffer | null = null;
    if (company.logoUrl) {
      logoBuf = await fetchImage(company.logoUrl);
    }
    if (!logoBuf) {
      const fallback = path.join(__dirname, "..", "assets", "deployr-logo-black.png");
      logoBuf = await fileImage(fallback);
    }

    // ── Build PDF ─────────────────────────────────────────────────────────
    const doc = new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const done = new Promise<void>((res) => doc.on("end", res));

    let y = MARGIN;

    // ── HEADER ───────────────────────────────────────────────────────────
    const LOGO_W = 110;
    const LOGO_H = 30;
    const INFO_W = 200;

    // Row 1: logo (left) + company info (right)
    if (logoBuf) {
      try {
        doc.image(logoBuf, MARGIN, y, { height: LOGO_H });
      } catch { /* skip bad image */ }
    }

    const INFO_X = PAGE_W - MARGIN - INFO_W;
    let infoY = y;
    doc.font("Helvetica").fontSize(7).fillColor("black");
    const companyLines: string[] = [];
    if (company.address) companyLines.push(company.address);
    if (company.phone) companyLines.push(`Tel. ${company.phone}`);
    if (company.email) companyLines.push(company.email);
    for (const line of companyLines) {
      doc.text(line, INFO_X, infoY, {
        width: INFO_W,
        align: "right",
        lineBreak: false,
      });
      infoY += 11;
    }

    y = Math.max(y + LOGO_H, infoY) + 10;

    // Row 2: centered title
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("black")
      .text("ORDEN DE TRABAJO", MARGIN, y, {
        width: CW,
        align: "center",
        lineBreak: false,
      });

    y += 30;

    // ── DATE / ID ROW ────────────────────────────────────────────────────
    y = tRow(
      doc,
      [
        {
          label: "FECHA",
          value: fmtDate(ticket.closedAt ?? report.createdAt),
          w: CW / 3,
        },
        { label: "ID INCIDENCIA", value: "", w: CW / 3 },
        { label: "FOLIO", value: report.folio ?? "—", w: CW / 3 },
      ],
      y,
      28,
    );
    y += 10;

    // ── SERVICIO ─────────────────────────────────────────────────────────
    y = secHdr(doc, "SERVICIO", y);

    y = tRow(
      doc,
      [
        { label: "CLIENTE", value: client.name, w: CW * 0.65 },
        {
          label: "FECHA DE TRABAJO",
          value: fmtDate(ticket.startedAt ?? ticket.scheduledAt),
          w: CW * 0.35,
        },
      ],
      y,
    );

    const contactName = branch?.contactName ?? technician?.name ?? "—";
    const contactPhone = branch?.phone ?? clientPhone;
    y = tRow(
      doc,
      [
        { label: "CONTACTO", value: contactName, w: CW * 0.65 },
        { label: "TELÉFONO", value: contactPhone, w: CW * 0.35 },
      ],
      y,
    );

    const addressParts = [branch?.address ?? clientAddress, branch?.city]
      .filter(Boolean)
      .join(", ");
    y = tRow(doc, [{ label: "DOMICILIO", value: addressParts, w: CW }], y);
    y = tRow(doc, [{ label: "LUGAR", value: branch?.city ?? "—", w: CW }], y);
    y = tRow(
      doc,
      [
        {
          label: "CORREO ELECTRÓNICO",
          value: branch?.contactEmail ?? clientEmail,
          w: CW,
        },
      ],
      y,
    );
    y += 10;

    // ── EQUIPO ────────────────────────────────────────────────────────────
    if (equipment) {
      y = guardPage(doc, y, HDR_H + ROW_H + 10);
      y = secHdr(doc, "EQUIPO", y);
      y = tRow(
        doc,
        [
          { label: "MARCA", value: equipment.brand ?? "—", w: CW / 3 },
          { label: "MODELO", value: equipment.model ?? "—", w: CW / 3 },
          { label: "SERIE", value: equipment.serialNumber ?? "—", w: CW / 3 },
        ],
        y,
      );
      y += 10;
    }

    // ── TEMPLATE FIELDS ───────────────────────────────────────────────────
    for (const field of template?.fields ?? []) {
      const rawVal = responses[field.id];
      if (!rawVal) continue;

      if (field.type === "PHOTO") {
        const urls = parseImageUrls(rawVal).filter(
          (u) => !u.startsWith("blob:")
        );

        if (!urls.length) continue;

        y = secHdr(doc, field.label, y);

        const COLS = 2;
        const GAP = 8;
        const IMG_W = (CW - GAP * (COLS - 1)) / COLS;
        const IMG_H = Math.round(IMG_W * 0.75);

        const bufs = await Promise.all(urls.map(fetchImage));
        const valid = bufs.filter((b): b is Buffer => b !== null);

        for (let i = 0; i < valid.length; i++) {
          const col = i % COLS;
          if (col === 0) {
            y = guardPage(doc, y, IMG_H + GAP);
          }
          const imgX = MARGIN + col * (IMG_W + GAP);
          try {
            doc.image(valid[i], imgX, y, { fit: [IMG_W, IMG_H], align: "center", valign: "center" });
          } catch (err) {
            console.error("Image error:", err);
          }
          if (col === COLS - 1 || i === valid.length - 1) {
            y += IMG_H + GAP;
          }
        }

        y += 10;
      } else if (field.type === "SIGNATURE") {
        const sigUrl = parseImageUrls(rawVal)[0];
        if (!sigUrl || sigUrl.startsWith("blob:")) continue;

        y = guardPage(doc, y, HDR_H + 80);
        y = secHdr(doc, field.label, y);

        const buf = await fetchImage(sigUrl);
        if (buf) {
          try {
            doc.image(buf, MARGIN + (CW - 390) / 2, y, { fit: [390, 108], align: "center", valign: "center" });
          } catch { /* skip */ }
          y += 114;
        }
        y += 10;

      } else if (field.type === "MULTISELECT") {
        let items: string[] = [];
        try { items = JSON.parse(rawVal); } catch { items = [rawVal]; }

        y = guardPage(doc, y, HDR_H + ROW_H + 10);
        y = secHdr(doc, field.label, y);
        y = tRow(doc, [{ label: "", value: items.join(", "), w: CW }], y);
        y += 10;

      } else {
        // TEXT, TEXTAREA, DATE, NUMBER
        const displayVal = field.type === "DATE" ? fmtDate(rawVal) : rawVal;
        const isTextarea = field.type === "TEXTAREA" || displayVal.length > 80;

        if (isTextarea) {
          // Estimate height from character count
          const CHARS_PER_LINE = Math.floor((CW - 8) / 4.2);
          const lines = Math.max(2, Math.ceil(displayVal.length / CHARS_PER_LINE));
          const cellH = Math.max(ROW_H, lines * 9 + 10);

          y = guardPage(doc, y, HDR_H + cellH + 10);
          y = secHdr(doc, field.label, y);
          doc.rect(MARGIN, y, CW, cellH).stroke(BORDER);
          doc
            .font("Helvetica")
            // .fontSize(7)
            .fillColor("#000000")
            .text(displayVal, MARGIN + 4, y + 4, {
              width: CW - 8,
              height: cellH - 8,
            });
          y += cellH + 10;
        } else {
          y = guardPage(doc, y, HDR_H + ROW_H + 10);
          y = secHdr(doc, field.label, y);
          y = tRow(doc, [{ label: "", value: displayVal, w: CW }], y);
          y += 10;
        }
      }
    }

    // ── SPARE PARTS ───────────────────────────────────────────────────────
    if (report.spareParts?.length > 0) {
      const spRows = 1 + report.spareParts.length;
      y = guardPage(doc, y, HDR_H + ROW_H * spRows + 10);
      y = secHdr(doc, "REFACCIONES UTILIZADAS", y);
      y = tRow(
        doc,
        [
          { label: "", value: "CANTIDAD", w: CW * 0.2 },
          { label: "", value: "ARTÍCULO", w: CW * 0.6 },
          { label: "", value: "SKU", w: CW * 0.2 },
        ],
        y,
      );
      for (const sp of report.spareParts) {
        y = tRow(
          doc,
          [
            { label: "", value: String(sp.quantity), w: CW * 0.2 },
            { label: "", value: sp.inventoryItem.name, w: CW * 0.6 },
            { label: "", value: sp.inventoryItem.sku ?? "—", w: CW * 0.2 },
          ],
          y,
        );
      }
      y += 10;
    }

    doc.end();
    await done;

    // ── Upload to Vercel Blob ─────────────────────────────────────────────
    const pdfBuf = Buffer.concat(chunks);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const blob = await put(`ticket-reports/pdf-${suffix}.pdf`, pdfBuf, {
      access: "public",
      contentType: "application/pdf",
      token: process.env.DEPLOYR_BLOB_READ_WRITE_TOKEN,
    });

    return blob.url;
  } catch (err) {
    console.error("[pdf-report] generation failed:", err);
    return null;
  }
}
