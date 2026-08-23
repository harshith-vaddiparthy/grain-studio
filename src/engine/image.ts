import type { ExportFormat, ExportSize, ImageSource } from "../types";
import { fitWithin } from "./math";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function validateImageFile(file: File) {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return "Choose a PNG, JPEG, or WebP image.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "That image is over the 50 MB limit.";
  }
  return null;
}

export async function loadImageFromUrl(url: string, name: string, isSample = false): Promise<ImageSource> {
  const element = new Image();
  element.decoding = "async";
  element.src = url;
  await element.decode();
  return {
    element,
    name,
    width: element.naturalWidth,
    height: element.naturalHeight,
    isSample,
  };
}

export async function loadImageFile(file: File): Promise<ImageSource> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);
  const objectUrl = URL.createObjectURL(file);
  try {
    const source = await loadImageFromUrl(objectUrl, file.name.replace(/\.[^.]+$/, "") || "texture");
    return { ...source, bytes: file.size, objectUrl, isSample: false };
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error("This image could not be decoded.");
  }
}

export function releaseImage(source: ImageSource | null) {
  if (source?.objectUrl) URL.revokeObjectURL(source.objectUrl);
}

export function exportDimensions(source: ImageSource, size: ExportSize) {
  if (size === "original") return fitWithin(source.width, source.height, 8192);
  return fitWithin(source.width, source.height, Number(size));
}

export function mimeForFormat(format: ExportFormat) {
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}

export function extensionForFormat(format: ExportFormat) {
  return format === "jpeg" ? "jpg" : format;
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The browser could not encode this image."))),
      mimeForFormat(format),
      format === "png" ? undefined : quality / 100,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
