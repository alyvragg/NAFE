"use client";

import { supabase } from "./supabase";
import { compressImageToWebP } from "./lily";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Error al leer imagen."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Comprime hasta 3 fotos de producto a WebP (máx 1080px), las sube DIRECTAMENTE
 * al CDN de Supabase Storage (`product-photos`) para cero dependencia del sleep de Render,
 * y registra cada asset en la tabla CDN `public.media_assets`.
 */
export async function uploadProductPhotos(
  files: File[],
  userId: string,
  businessId?: string
): Promise<string[]> {
  const sliced = files.slice(0, 10);
  if (sliced.length === 0) return [];

  const cleanUserId = userId?.trim() || "local-user";
  const folderBiz = businessId?.trim() || "draft";

  const compressedBlobs = await Promise.all(
    sliced.map((file) => compressImageToWebP(file, 1080, 0.84))
  );

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  const uploadedUrls: string[] = [];
  const stamp = Date.now();

  for (let i = 0; i < compressedBlobs.length; i++) {
    const blob = compressedBlobs[i];
    try {
      const objectPath = `${cleanUserId}/${folderBiz}/${stamp}-${i}.webp`;
      const { error } = await supabase.storage
        .from("product-photos")
        .upload(objectPath, blob, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: true,
        });

      if (!error) {
        const { data } = supabase.storage
          .from("product-photos")
          .getPublicUrl(objectPath);

        const publicUrl = data.publicUrl;
        uploadedUrls.push(publicUrl);

        // Registrar en la tabla CDN public.media_assets
        const validBusinessUuid =
          businessId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            businessId
          )
            ? businessId
            : null;

        await supabase.from("media_assets").upsert(
          {
            business_id: validBusinessUuid,
            owner_id: user?.id ?? null,
            bucket: "product-photos",
            object_path: objectPath,
            public_url: publicUrl,
            mime_type: "image/webp",
            size_bytes: blob.size,
            is_cover: i === 0,
          },
          { onConflict: "object_path" }
        );
        continue;
      }
    } catch {
      // Fallback a data URL solo si no hay red
    }

    const fallbackDataUrl = await blobToDataUrl(blob);
    uploadedUrls.push(fallbackDataUrl);
  }

  return uploadedUrls;
}
