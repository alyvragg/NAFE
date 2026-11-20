import express, { Request, Response, NextFunction } from "express";
import { randomInt } from "node:crypto";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { createClient, User } from "@supabase/supabase-js";
import { sendEmail, sendOtpEmail } from "./email";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://widycevcjjruphtbkuqp.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "sb_publishable_Um8IIgU5HOWDsE-U7W8eog_XJSVavjo";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "2mb" }));

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

app.post("/api/email/otp/request", async (req: Request, res: Response): Promise<void> => {
  const to = normalizeEmail(req.body?.to);
  const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 80) : "Vecino";
  if (!emailPattern.test(to)) {
    res.status(400).json({ error: "Ingresa un correo electrónico válido." });
    return;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY) {
    res.status(503).json({ error: "El servicio de verificación no está configurado." });
    return;
  }
  try {
    const { data: previous } = await supabaseAdmin
      .from("otp_verifications")
      .select("created_at")
      .eq("contact_normalized", to)
      .maybeSingle();
    if (previous && Date.now() - new Date(previous.created_at).getTime() < 30_000) {
      res.status(429).json({ error: "Espera 30 segundos antes de solicitar otro código." });
      return;
    }

    const code = String(randomInt(0, 100_000)).padStart(5, "0");
    const { error: storeError } = await supabaseAdmin.from("otp_verifications").upsert({
      contact_normalized: to,
      code,
      verified: false,
      attempts: 0,
      consumed_at: null,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      created_at: new Date().toISOString(),
    }, { onConflict: "contact_normalized" });
    if (storeError) throw storeError;

    const result = await sendOtpEmail({ to, name, code });
    if (result.error) {
      await supabaseAdmin.from("otp_verifications").delete().eq("contact_normalized", to);
      res.status(502).json({ error: "No se pudo enviar el correo. Intenta de nuevo." });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("OTP request failed:", err);
    res.status(500).json({ error: "No se pudo procesar la solicitud de verificación." });
  }
});

app.post("/api/email/otp/verify", async (req: Request, res: Response): Promise<void> => {
  const to = normalizeEmail(req.body?.to);
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!emailPattern.test(to) || !/^\d{5}$/.test(code)) {
    res.status(400).json({ error: "Correo o código inválido." });
    return;
  }
  try {
    const { data: row, error } = await supabaseAdmin
      .from("otp_verifications")
      .select("id, code, expires_at, attempts, consumed_at")
      .eq("contact_normalized", to)
      .maybeSingle();
    if (error) throw error;
    if (!row || row.consumed_at || new Date(row.expires_at).getTime() <= Date.now() || row.attempts >= 5) {
      res.status(400).json({ error: "El código es incorrecto o expiró." });
      return;
    }
    if (row.code !== code) {
      await supabaseAdmin.from("otp_verifications").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      res.status(400).json({ error: "El código es incorrecto o expiró." });
      return;
    }
    await supabaseAdmin.from("otp_verifications").update({ verified: true }).eq("id", row.id);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("OTP verification failed:", err);
    res.status(500).json({ error: "No se pudo verificar el código." });
  }
});

app.post("/api/email/otp/consume", async (req: Request, res: Response): Promise<void> => {
  const to = normalizeEmail(req.body?.to);
  if (!emailPattern.test(to)) {
    res.status(400).json({ error: "Correo inválido." });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("otp_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("contact_normalized", to)
    .eq("verified", true)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: "No se pudo confirmar la verificación." });
    return;
  }
  if (!data) {
    res.status(403).json({ error: "Verifica tu correo antes de crear la cuenta." });
    return;
  }
  res.status(200).json({ ok: true });
});

const ALLOWED_MIME_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
]);

// MemoryStorage exclusivo (PROHIBIDO disco local efímero en Render Free)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024, // 3 MB máx
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Formato no permitido. Usa WebP, JPEG o PNG."));
      return;
    }
    cb(null, true);
  },
});

const productUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4 MB máx por foto
    files: 3,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Formato no permitido. Usa WebP, JPEG o PNG."));
      return;
    }
    cb(null, true);
  },
});

interface AuthenticatedRequest extends Request {
  user?: User;
}

async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    res.status(401).json({ error: "Token Bearer requerido." });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "Sesión inválida o expirada." });
    return;
  }

  req.user = data.user;
  next();
}

// 1. Health Check para Render Free (/api/health y /health)
app.get(["/api/health", "/health"], (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "nafe-api" });
});

// 2. Subida de Foto de Perfil (función lily) -> Bucket "avatars"
app.post(
  "/api/media/avatar",
  requireAuth,
  avatarUpload.single("file"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: "No se recibió archivo de imagen." });
        return;
      }

      const objectPath = `${user.id}/avatar-${Date.now()}.webp`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("avatars")
        .upload(objectPath, file.buffer, {
          contentType: file.mimetype || "image/webp",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        res.status(500).json({ error: uploadError.message });
        return;
      }

      const { data: pubData } = supabaseAdmin.storage
        .from("avatars")
        .getPublicUrl(objectPath);

      const publicUrl = pubData.publicUrl;

      await supabaseAdmin
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      res.status(200).json({ url: publicUrl });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error interno al subir avatar.";
      res.status(500).json({ error: message });
    }
  }
);

// 3. Subida de Fotos de Productos (hasta 3) -> Bucket "product-photos"
app.post(
  "/api/media/product",
  requireAuth,
  productUpload.array("files", 3),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const files = (req.files as Express.Multer.File[]) || [];
      const businessId =
        typeof req.body?.businessId === "string" && req.body.businessId.trim()
          ? req.body.businessId.trim()
          : "draft";

      if (files.length === 0) {
        res.status(400).json({ error: "No se recibieron fotos del producto." });
        return;
      }

      const urls: string[] = [];
      const stamp = Date.now();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const objectPath = `${user.id}/${businessId}/${stamp}-${i}.webp`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("product-photos")
          .upload(objectPath, file.buffer, {
            contentType: file.mimetype || "image/webp",
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          res.status(500).json({ error: uploadError.message });
          return;
        }

        const { data: pubData } = supabaseAdmin.storage
          .from("product-photos")
          .getPublicUrl(objectPath);

        urls.push(pubData.publicUrl);
      }

      res.status(200).json({ urls });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error interno al subir fotos del producto.";
      res.status(500).json({ error: message });
    }
  }
);

// 4. Envío de correos transaccionales vía Resend
app.post("/api/email/send", async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, subject, html, from } = (req.body || {}) as {
      to?: string;
      subject?: string;
      html?: string;
      from?: string;
    };

    const result = await sendEmail({ to, subject, html, from });
    if (result.error) {
      res.status(400).json({ ok: false, error: result.error.message });
      return;
    }

    res.status(200).json({ ok: true, id: result.data?.id ?? null });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error interno al enviar correo.";
    res.status(500).json({ ok: false, error: message });
  }
});

// 5. Envío de código OTP de verificación de registro en NAFE vía Resend
app.post("/api/email/otp", async (req: Request, res: Response): Promise<void> => {
  try {
    const { to, name, code } = (req.body || {}) as {
      to?: string;
      name?: string;
      code?: string;
    };

    if (!to || !code) {
      res.status(400).json({
        ok: false,
        error: "Los campos 'to' y 'code' son requeridos.",
      });
      return;
    }

    const result = await sendOtpEmail({ to, name, code });
    if (result.error) {
      res.status(400).json({ ok: false, error: result.error.message });
      return;
    }

    res.status(200).json({ ok: true, id: result.data?.id ?? null });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error interno al enviar OTP.";
    res.status(500).json({ ok: false, error: message });
  }
});

app.listen(PORT, () => {
  console.log(`[nafe-api] Render Media & Email Service escuchando en puerto ${PORT}`);
});
