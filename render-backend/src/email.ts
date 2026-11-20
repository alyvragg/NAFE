import { Resend } from "resend";

const DEFAULT_FROM = process.env.RESEND_FROM || "onboarding@resend.dev";
const DEFAULT_TO = process.env.RESEND_DEFAULT_TO || "alyvragg@proton.me";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurada en el entorno.");
  }
  return new Resend(apiKey);
}

export async function sendEmail(params: {
  to?: string;
  subject?: string;
  html?: string;
  from?: string;
}) {
  const resend = getResendClient();
  const to = params.to?.trim() || DEFAULT_TO;
  const from = params.from?.trim() || DEFAULT_FROM;
  const subject = params.subject?.trim() || "Hello World";
  const html =
    params.html?.trim() ||
    "<p>Congrats on sending your <strong>first email</strong>!</p>";

  return resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}

export async function sendOtpEmail(params: {
  to: string;
  name?: string;
  code: string;
}) {
  const safeName = (params.name || "Vecino").replace(/[<>&"]/g, "");
  const safeCode = params.code.replace(/[^0-9A-Za-z]/g, "").slice(0, 8);

  return sendEmail({
    to: params.to,
    subject: `Tu código de verificación NAFE: ${safeCode}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#F7F7F4; padding:28px; color:#13150C;">
        <div style="max-width:460px; margin:0 auto; background:#FFFFFF; border-radius:12px; padding:28px;">
          <p style="font-size:12px; letter-spacing:0.16em; font-weight:600; color:#2B4628; margin:0 0 12px;">NAFE</p>
          <h1 style="font-size:20px; font-weight:600; margin:0 0 10px; color:#13150C;">Hola, ${safeName}</h1>
          <p style="font-size:14px; line-height:1.5; color:#6E6D5F; margin:0 0 20px;">
            Usa este código para confirmar tu cuenta en NAFE:
          </p>
          <div style="background:#EFEFEA; border-radius:10px; padding:16px; text-align:center; font-size:28px; font-weight:700; letter-spacing:0.25em; color:#2B4628;">
            ${safeCode}
          </div>
          <p style="font-size:12px; color:#6E6D5F; margin:20px 0 0;">
            Confianza en lo que nace cerca.
          </p>
        </div>
      </div>
    `,
  });
}
