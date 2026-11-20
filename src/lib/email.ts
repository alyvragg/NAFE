"use client";

const RAW_RENDER_URL = (process.env.NEXT_PUBLIC_RENDER_API_URL || "").replace(
  /\/+$/,
  ""
);

function getSafeRenderApiUrl(): string {
  if (!RAW_RENDER_URL) return "";
  // En Android / producción jamás intentar conectar a localhost
  const isLocalUrl =
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(
      RAW_RENDER_URL
    );
  if (isLocalUrl && typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "";
    }
    if ("__TAURI_INTERNALS__" in window) {
      return "";
    }
  }
  return RAW_RENDER_URL;
}

export function isRenderEmailConfigured(): boolean {
  return Boolean(getSafeRenderApiUrl());
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 5500
): Promise<Response> {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(id);
  }
}

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
  const apiUrl = getSafeRenderApiUrl();
  if (!apiUrl) {
    return { ok: false, error: "Servicio de correo no configurado" };
  }
  try {
    const response = await fetchWithTimeout(`${apiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
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
  const apiUrl = getSafeRenderApiUrl();
  if (!apiUrl) {
    return { ok: false, error: "Render API URL no configurada" };
  }

  try {
    const res = await fetchWithTimeout(`${apiUrl}/api/email/send`, {
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
