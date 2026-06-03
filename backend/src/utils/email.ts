import nodemailer from "nodemailer";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendApprovalRequestEmail({
  to,
  ticketTitle,
  documentUrl,
  companyName,
  approvalUrl,
}: {
  to: string[];
  ticketTitle: string;
  documentUrl: string;
  companyName: string;
  approvalUrl?: string;
}) {
  if (!process.env.SMTP_USER || !to.length) return;

  const transporter = createTransport();

  const approvalNote = approvalUrl
    ? `\n\nPuede aprobar el servicio ingresando a su portal: ${approvalUrl}`
    : "";

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? `"${companyName}" <no-reply@deployr.app>`,
    to: to.join(", "),
    subject: `Aprobación requerida: ${ticketTitle}`,
    text: [
      `Estimado cliente,`,
      ``,
      `Se ha completado la revisión del servicio "${ticketTitle}" y se requiere su aprobación para proceder con la instalación de repuestos.`,
      ``,
      `Adjuntamos el documento de revisión con los detalles del servicio.${approvalNote}`,
      ``,
      `${companyName}`,
    ].join("\n"),
    attachments: [
      {
        filename: "revision-servicio.pdf",
        path: documentUrl,
      },
    ],
  });
}
