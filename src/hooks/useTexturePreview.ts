import { useEffect, useRef, useState } from "react";
import { TEXTURES } from "../data/filters";
import { fitWithin } from "../engine/math";
import { drawOriginal, renderTexture } from "../engine/render";
import type { ImageSource, RenderStatus, TextureId, TextureSettings } from "../types";

export function useTexturePreview(
  source: ImageSource | null,
  textureId: TextureId,
  settings: TextureSettings,
) {
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<RenderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const renderVersion = useRef(0);

  useEffect(() => {
    if (!source) {
      setStatus("idle");
      setError(null);
      return;
    }

    const version = ++renderVersion.current;
    setStatus("rendering");
    const frame = window.requestAnimationFrame(() => {
      if (version !== renderVersion.current) return;
      try {
        const fitted = fitWithin(source.width, source.height, 1280);
        const processed = processedCanvasRef.current;
        const original = originalCanvasRef.current;
        if (!processed || !original) return;
        renderTexture(source.element, processed, textureId, settings, fitted.width, fitted.height);
        drawOriginal(source.element, original, fitted.width, fitted.height);
        if (version !== renderVersion.current) return;
        setDimensions({ width: fitted.width, height: fitted.height });
        setError(null);
        setStatus("ready");
      } catch (caught) {
        if (version !== renderVersion.current) return;
        setError(caught instanceof Error ? caught.message : "The preview could not be rendered.");
        setStatus("error");
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [source, textureId, settings]);

  return { processedCanvasRef, originalCanvasRef, status, error, dimensions };
}

export function useTextureThumbnails(source: ImageSource | null) {
  const [thumbnails, setThumbnails] = useState<Partial<Record<TextureId, string>>>({});

  useEffect(() => {
    setThumbnails({});
    if (!source) return;
    let cancelled = false;
    let timer = 0;
    let index = 0;

    const renderNext = () => {
      if (cancelled || index >= TEXTURES.length) return;
      const texture = TEXTURES[index];
      index += 1;
      try {
        const canvas = document.createElement("canvas");
        renderTexture(source.element, canvas, texture.id, texture.defaults, 78, 78);
        const preview = canvas.toDataURL("image/webp", 0.72);
        if (!cancelled) setThumbnails((current) => ({ ...current, [texture.id]: preview }));
      } catch {
        // The CSS swatch remains as a resilient fallback.
      }
      if (!cancelled && index < TEXTURES.length) timer = window.setTimeout(renderNext, 18);
    };

    timer = window.setTimeout(renderNext, 40);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source]);

  return thumbnails;
}
