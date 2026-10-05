import type { ExportFormat, ExportSize, ImageSource } from "../types";
import { readImageDimensions } from "./image-dimensions";
export const MAX_EXPORT_PIXELS = 16_777_216;
export const MAX_EXPORT_EDGE = 8192;
const MAX_SOURCE_PIXELS = 100_000_000;
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
  const header = new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer());
  const dimensions = readImageDimensions(header, file.type);
  if (dimensions.width * dimensions.height > MAX_SOURCE_PIXELS) {
    throw new Error("That image is over the 100 MP source limit.");
  }
  const objectUrl = URL.createObjectURL(file);
  let source: ImageSource;
  try {
    source = await loadImageFromUrl(objectUrl, file.name.replace(/\.[^.]+$/, "") || "texture");
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error("This image could not be decoded.");
  }
  if (!Number.isInteger(source.width) || !Number.isInteger(source.height) || source.width < 1 || source.height < 1) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("This image has invalid decoded dimensions.");
  }
  if (source.width * source.height > MAX_SOURCE_PIXELS) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("That image is over the 100 MP source limit.");
  }
  return { ...source, bytes: file.size, objectUrl, isSample: false };
}

export function releaseImage(source: ImageSource | null) {
  if (source?.objectUrl) URL.revokeObjectURL(source.objectUrl);
}

export function exportDimensions(source: ImageSource, size: ExportSize) {
  const width = Math.max(1, Math.floor(source.width));
  const height = Math.max(1, Math.floor(source.height));
  const maxSide = size === "original" ? MAX_EXPORT_EDGE : Number(size);
  const scale = Math.min(1, maxSide / Math.max(width, height), Math.sqrt(MAX_EXPORT_PIXELS / (width * height)));
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    scale,
  };
}

export function mimeForFormat(format: ExportFormat) {
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}

export function extensionForFormat(format: ExportFormat) {
  return format === "jpeg" ? "jpg" : format;
}

export function assertExportBlob(blob: Blob | null, format: ExportFormat): asserts blob is Blob {
  if (!blob || blob.size === 0) throw new Error("The browser could not encode this image.");
  if (blob.type !== mimeForFormat(format)) {
    throw new Error(`The browser returned the wrong format for ${format.toUpperCase()}.`);
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        try {
          assertExportBlob(blob, format);
          resolve(blob);
        } catch (error) {
          reject(error);
        }
      },
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
