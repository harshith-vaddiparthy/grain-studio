import type { ExportFormat, TextureId, TextureSettings } from '../types';
import { assertExportBlob, canvasToBlob, MAX_EXPORT_EDGE, MAX_EXPORT_PIXELS } from './image';
import { renderTexture } from './render';

export type ExportStage = 'preparing' | 'rendering' | 'encoding';

export type ExportWorkerRequest = {
  requestId: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  textureId: TextureId;
  settings: TextureSettings;
  preserveTransparency: boolean;
  format: ExportFormat;
  quality: number;
};

export type ExportWorkerMessage =
  | { requestId: number; stage: 'rendering' | 'encoding' }
  | { requestId: number; stage: 'done'; blob: Blob }
  | { requestId: number; stage: 'error'; message: string };

export type ExportTextureFileOptions = {
  source: HTMLImageElement;
  textureId: TextureId;
  settings: TextureSettings;
  width: number;
  height: number;
  format: ExportFormat;
  quality: number;
  preserveTransparency?: boolean;
  signal?: AbortSignal;
  onStage?: (stage: ExportStage) => void;
};

let nextRequestId = 0;

function abortError() {
  return new DOMException('Export cancelled.', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

function remaining(deadline: number) {
  const milliseconds = deadline - Date.now();
  if (milliseconds <= 0) throw new Error('The export timed out after 60 seconds.');
  return milliseconds;
}

function closeBitmap(bitmap: ImageBitmap) {
  try {
    bitmap.close();
  } catch {
    // The bitmap may already have been transferred to the worker.
  }
}

function interruptible<T>(
  task: Promise<T>,
  signal: AbortSignal | undefined,
  milliseconds: number,
  disposeLate?: (value: T) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    function onAbort() { fail(abortError()); }
    timer = setTimeout(() => fail(new Error('The export timed out after 60 seconds.')), milliseconds);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
    task.then(
      (value) => {
        if (settled) {
          try { disposeLate?.(value); } catch { /* The late result can be discarded. */ }
          return;
        }
        settled = true;
        cleanup();
        resolve(value);
      },
      fail,
    );
  });
}

export function canUseWorkerExport() {
  return typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap === 'function' &&
    typeof OffscreenCanvas.prototype.convertToBlob === 'function';
}

export async function exportTextureFile(options: ExportTextureFileOptions): Promise<Blob> {
  const { width, height, format, quality, signal, onStage } = options;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      Math.max(width, height) > MAX_EXPORT_EDGE || width * height > MAX_EXPORT_PIXELS) {
    throw new Error('Export dimensions exceed the 16 MP / 8,192 px limit.');
  }
  throwIfAborted(signal);
  const deadline = Date.now() + 60_000;
  const preserveTransparency = format !== 'jpeg' && options.preserveTransparency !== false;
  onStage?.('preparing');

  if (canUseWorkerExport()) {
    const bitmap = await interruptible(createImageBitmap(options.source, { resizeWidth: width, resizeHeight: height, resizeQuality: 'high' }), signal, remaining(deadline), closeBitmap);
    let worker: Worker | null = null;
    try {
      throwIfAborted(signal);
      worker = new Worker(new URL('./export.worker.ts', import.meta.url), { type: 'module' });
      const activeWorker = worker;
      const requestId = ++nextRequestId;
      const request: ExportWorkerRequest = {
        requestId,
        bitmap,
        width,
        height,
        textureId: options.textureId,
        settings: options.settings,
        preserveTransparency,
        format,
        quality,
      };
      const response = new Promise<Blob>((resolve, reject) => {
        activeWorker.onmessage = (event: MessageEvent<ExportWorkerMessage>) => {
          const message = event.data;
          if (!message || message.requestId !== requestId) return;
          if (message.stage === 'rendering' || message.stage === 'encoding') {
            onStage?.(message.stage);
          } else if (message.stage === 'done') {
            try { assertExportBlob(message.blob, format); resolve(message.blob); } catch (error) { reject(error); }
          } else if (message.stage === 'error') {
            reject(new Error(message.message));
          }
        };
        activeWorker.onerror = (event) => {
          event.preventDefault();
          reject(new Error('The export worker failed.'));
        };
        activeWorker.onmessageerror = () => reject(new Error('The export worker response could not be read.'));
        activeWorker.postMessage(request, [bitmap]);
      });
      return await interruptible(response, signal, remaining(deadline));
    } finally {
      if (worker) {
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        worker.terminate();
      }
      closeBitmap(bitmap);
    }
  }

  if (width * height > 4_194_304 || Math.max(width, height) > 2048) {
    throw new Error('This browser needs a 2048px or smaller export. Background rendering is unavailable.');
  }
  await interruptible(new Promise<void>((resolve) => setTimeout(resolve, 0)), signal, remaining(deadline));
  throwIfAborted(signal);
  onStage?.('rendering');
  const canvas = document.createElement('canvas');
  renderTexture(options.source, canvas, options.textureId, options.settings, width, height, { preserveTransparency });
  throwIfAborted(signal);
  onStage?.('encoding');
  return await interruptible(canvasToBlob(canvas, format, quality), signal, remaining(deadline));
}
