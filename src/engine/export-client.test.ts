import { afterEach, describe, expect, it, vi } from "vitest";
import { exportTextureFile } from "./export";

const bitmap = { close: vi.fn() };
const source = {} as HTMLImageElement;
const options = { source, textureId: "film-grain" as const, settings: { intensity: 65, detail: 60, contrast: 50, scale: 8, palette: "source" as const, seed: 17 }, width: 100, height: 80, format: "png" as const, quality: 92 };

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { preventDefault: () => void }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  terminate = vi.fn();
  request: { requestId: number } | null = null;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(request: { requestId: number }) { this.request = request; }
}

const install = () => {
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("OffscreenCanvas", class { convertToBlob() {} });
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
};

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); FakeWorker.instances = []; bitmap.close.mockClear(); });

describe("export lifecycle", () => {
  it("does not create a bitmap or worker for an already cancelled export", async () => {
    install();
    const controller = new AbortController(); controller.abort();
    await expect(exportTextureFile({ ...options, signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(FakeWorker.instances).toHaveLength(0);
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("terminates only the active export worker on cancellation", async () => {
    install();
    const controller = new AbortController();
    const result = exportTextureFile({ ...options, signal: controller.signal });
    await Promise.resolve(); await Promise.resolve();
    const worker = FakeWorker.instances[0];
    expect(worker).toBeDefined();
    expect(createImageBitmap).toHaveBeenCalledWith(source, { resizeWidth: options.width, resizeHeight: options.height, resizeQuality: "high" });
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("rejects worker errors without repeating the export", async () => {
    install();
    const result = exportTextureFile(options);
    await Promise.resolve(); await Promise.resolve();
    const worker = FakeWorker.instances[0];
    worker.onerror?.({ preventDefault() {} });
    await expect(result).rejects.toThrow(/worker failed/i);
    expect(FakeWorker.instances).toHaveLength(1);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("checks the actual encoder format before a result can reach download", async () => {
    install();
    const result = exportTextureFile(options);
    await Promise.resolve(); await Promise.resolve();
    const worker = FakeWorker.instances[0];
    worker.onmessage?.({ data: { requestId: worker.request?.requestId, stage: "done", blob: new Blob(["test"], { type: "image/webp" }) } });
    await expect(result).rejects.toThrow(/wrong format/i);
  });
});
