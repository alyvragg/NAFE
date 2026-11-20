"use client";

import { supabase } from "./supabase";
import { loadLocalProfile, saveLocalProfile } from "@/components/auth/validators";

/**
 * Comprime y redimensiona una imagen en el cliente usando HTML Canvas a WebP.
 */
export async function compressImageToWebP(
  file: File,
  maxDimension: number,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo procesar la imagen seleccionada."));
    };

    img.src = objectUrl;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Error al leer imagen."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Función obligatoria `lily`:
 * 1) Comprime la foto de perfil a WebP máx 400x400 px (calidad 0.82).
 * 2) Sube directamente al CDN de Supabase Storage (`avatars`) para funcionar 24/7 sin depender del sleep de Render.
 * 3) Registra el asset en `public.media_assets` y actualiza `profiles.avatar_url`.
 */
export async function lily(file: File, userId: string): Promise<string> {
  const cleanUserId = userId?.trim() || "local-user";
  const webpBlob = await compressImageToWebP(file, 400, 0.82);

  const {
    data: { session },
  } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));

  // 1. Subida directa al CDN de Supabase Storage (`avatars`)
  try {
    const objectPath = `${cleanUserId}/avatar-${Date.now()}.webp`;
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(objectPath, webpBlob, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });

    if (!uploadErr) {
      const { data: pub } = supabase.storage
        .from("avatars")
        .getPublicUrl(objectPath);

      const publicUrl = pub.publicUrl;

      // Registrar en la tabla CDN public.media_assets
      await supabase.from("media_assets").upsert(
        {
          owner_id: session?.user?.id ?? null,
          bucket: "avatars",
          object_path: objectPath,
          public_url: publicUrl,
          mime_type: "image/webp",
          size_bytes: webpBlob.size,
          is_cover: true,
        },
        { onConflict: "object_path" }
      );

      if (session?.user?.id) {
        await supabase
          .from("profiles")
          .update({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.user.id);
      }

      persistLocalAvatar(publicUrl);
      return publicUrl;
    }
  } catch {
    // Fallback local solo si no hay red
  }

  // 2. Fallback offline en memoria local
  const dataUrl = await blobToDataUrl(webpBlob);
  persistLocalAvatar(dataUrl);
  return dataUrl;
}

function persistLocalAvatar(avatarUrl: string): void {
  const current = loadLocalProfile();
  if (current) {
    saveLocalProfile({
      ...current,
      avatarUrl,
    });
  }
}
