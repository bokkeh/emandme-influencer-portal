import { put } from "@vercel/blob";
import { Storage } from "@google-cloud/storage";

type UploadInput = File | Buffer | Uint8Array | ArrayBuffer;

function normalizePath(pathname: string) {
  const cleaned = pathname.replace(/^\/+/, "").replace(/\.\./g, "");
  if (!cleaned) throw new Error("Invalid upload path");
  return cleaned;
}

function getGcsConfig() {
  const projectId = process.env.GCS_PROJECT_ID?.trim();
  const bucket = process.env.GCS_BUCKET?.trim();
  const clientEmail = process.env.GCS_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.GCS_PRIVATE_KEY;
  if (!projectId || !bucket || !clientEmail || !privateKeyRaw) return null;
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  return { projectId, bucket, clientEmail, privateKey };
}

function getPublicObjectUrl(bucket: string, objectPath: string) {
  const base = process.env.GCS_PUBLIC_BASE_URL?.trim();
  if (base) {
    return `${base.replace(/\/$/, "")}/${objectPath}`;
  }
  const encodedPath = objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://storage.googleapis.com/${bucket}/${encodedPath}`;
}

function createStorageClient(config: NonNullable<ReturnType<typeof getGcsConfig>>) {
  return new Storage({
    projectId: config.projectId,
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
  });
}

async function toBuffer(data: UploadInput): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (typeof (data as File).arrayBuffer === "function") {
    const arr = await (data as File).arrayBuffer();
    return Buffer.from(arr);
  }
  throw new Error("Unsupported upload payload");
}

export function isGcsConfigured() {
  return Boolean(getGcsConfig());
}

export async function createSignedUploadUrl(pathname: string, contentType: string) {
  const objectPath = normalizePath(pathname);
  const config = getGcsConfig();
  if (!config) {
    return { provider: "blob" as const };
  }

  const storage = createStorageClient(config);
  const file = storage.bucket(config.bucket).file(objectPath);
  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });

  return {
    provider: "gcs" as const,
    uploadUrl,
    publicUrl: getPublicObjectUrl(config.bucket, objectPath),
    objectPath,
  };
}

export async function uploadPublicFile(pathname: string, data: UploadInput, contentType?: string) {
  const objectPath = normalizePath(pathname);
  const config = getGcsConfig();

  if (!config) {
    let blobPayload: File | Buffer | ArrayBuffer = data as File | Buffer | ArrayBuffer;
    if (data instanceof Uint8Array) blobPayload = Buffer.from(data);
    if (data instanceof ArrayBuffer) blobPayload = Buffer.from(data);
    const blob = await put(objectPath, blobPayload, {
      access: "public",
      contentType,
    });
    return { url: blob.url, provider: "blob" as const };
  }

  const storage = createStorageClient(config);
  const file = storage.bucket(config.bucket).file(objectPath);
  await file.save(await toBuffer(data), {
    contentType,
    resumable: false,
  });
  return {
    url: getPublicObjectUrl(config.bucket, objectPath),
    provider: "gcs" as const,
  };
}
