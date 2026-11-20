"use client";

const RENDER_API_URL = (process.env.NEXT_PUBLIC_RENDER_API_URL || "").replace(
  /\/+$/,
  ""
);

export async function requestEmailVerification(params: {
  to: string;
  name?: string;
}): Promise<{ ok: boolean; error?: string }> {
  return callVerificationApi("/api/email/otp/request", params);
}

export async function verifyEmailCode(params: {
  to: string;
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  return callVerificationApi("/api/email/otp/verify", params);
}

export async function consumeEmailVerification(to: string): Promise<boolean> {
  const result = await callVerificationApi("/api/email/otp/consume", { to });
  return result.ok;
}

async function callVerificationApi(
  path: string,
  body: Record<string, string | undefined>
): Promise<{ ok: boolean; error?: string }> {
  if (!RENDER_API_URL) return { ok: false, error: "Servicio de correo no configurado" };
  try {
    const response = await fetch(`${RENDER_API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: response.ok, error: data.error };
  } catch {
    return { ok: false, error: "Sin conexión con el servicio de verificación" };
  }
}

export async function sendTransactionalEmail(params: {
  to?: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; id?: string | null; error?: string }> {
  if (!RENDER_API_URL) {
    return { ok: false, error: "Render API URL no configurada" };
  }

  try {
    const res = await fetch(`${RENDER_API_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      id?: string | null;
      error?: string;
    };
    return { ok: res.ok && Boolean(data.ok), id: data.id, error: data.error };
  } catch {
    return { ok: false, error: "Sin conexión con el servicio de correo" };
  }
}
