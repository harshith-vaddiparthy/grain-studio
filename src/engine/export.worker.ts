import type { ExportWorkerMessage, ExportWorkerRequest } from './export';
import { assertExportBlob, mimeForFormat } from './image';
import { renderTexture } from './render';

type WorkerScope = {
  onmessage: ((event: MessageEvent<ExportWorkerRequest>) => void) | null;
  postMessage: (message: ExportWorkerMessage) => void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  const request = event.data;
  void (async () => {
    try {
      if (typeof OffscreenCanvas === 'undefined') throw new Error('Offscreen canvas is unavailable.');
      const { requestId, bitmap, width, height, textureId, settings, preserveTransparency, format, quality } = request;
      const canvas = new OffscreenCanvas(width, height);
      scope.postMessage({ requestId, stage: 'rendering' });
      renderTexture(bitmap, canvas as unknown as HTMLCanvasElement, textureId, settings, width, height, { preserveTransparency });
      scope.postMessage({ requestId, stage: 'encoding' });
      const blob = await canvas.convertToBlob({
        type: mimeForFormat(format),
        ...(format === 'png' ? {} : { quality: quality / 100 }),
      });
      assertExportBlob(blob, format);
      scope.postMessage({ requestId, stage: 'done', blob });
    } catch (error) {
      scope.postMessage({
        requestId: request.requestId,
        stage: 'error',
        message: error instanceof Error ? error.message : 'The image could not be exported.',
      });
    } finally {
      request.bitmap.close();
    }
  })();
};
