import { put } from "@vercel/blob";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_FILE_SIZE_MB = Number(process.env.MAX_UPLOAD_FILE_MB ?? "4096");

export const ALLOWED_UPLOAD_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
export const MAX_UPLOAD_FILE_MB = MAX_FILE_SIZE_MB;

export function validateFile(file: File): { valid: boolean; error?: string } {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    return { valid: false, error: "Unsupported file type. Upload JPG, PNG, WEBP, MP4, or MOV." };
  }
  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > MAX_FILE_SIZE_MB) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` };
  }
  return { valid: true };
}

export async function uploadAsset(
  file: File,
  influencerProfileId: string
): Promise<{ url: string; fileType: "image" | "video"; fileSizeMb: number }> {
  const validation = validateFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const fileType = ALLOWED_IMAGE_TYPES.includes(file.type) ? "image" : "video";
  const ext = file.name.split(".").pop() ?? "bin";
  const pathname = `assets/${influencerProfileId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
  });

  const fileSizeMb = file.size / (1024 * 1024);

  return { url: blob.url, fileType, fileSizeMb };
}
