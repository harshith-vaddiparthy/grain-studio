import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { CanvasStage } from "./components/CanvasStage";
import { ExportDialog } from "./components/ExportDialog";
import { Inspector } from "./components/Inspector";
import { InstallDialog } from "./components/InstallDialog";
import { SourceRail } from "./components/SourceRail";
import { TextureDock } from "./components/TextureDock";
import { Toast } from "./components/Toast";
import { TEXTURES, TEXTURE_BY_ID } from "./data/filters";
import { canvasToBlob, downloadBlob, exportDimensions, extensionForFormat, loadImageFile, loadImageFromUrl, releaseImage } from "./engine/image";
import { fitWithin } from "./engine/math";
import { renderTexture } from "./engine/render";
import { useTexturePreview, useTextureThumbnails } from "./hooks/useTexturePreview";
import type { ExportFormat, ExportSize, ImageSource, TextureCategory, TextureId, TextureSettings } from "./types";

const initialSettings = () => Object.fromEntries(
  TEXTURES.map((texture) => [texture.id, { ...texture.defaults }]),
) as Record<TextureId, TextureSettings>;

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "texture";
}

export default function App() {
  const [source, setSource] = useState<ImageSource | null>(null);
  const sourceRef = useRef<ImageSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const historyRef = useRef<Array<{ id: TextureId; settings: TextureSettings }>>([]);

  const [selectedId, setSelectedId] = useState<TextureId>("riso-print");
  const [settingsById, setSettingsById] = useState(initialSettings);
  const [category, setCategory] = useState<"All" | TextureCategory>("All");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compare, setCompare] = useState(50);
  const [revealOriginal, setRevealOriginal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const texture = TEXTURE_BY_ID[selectedId];
  const settings = settingsById[selectedId];
  const visibleTextures = useMemo(
    () => category === "All" ? TEXTURES : TEXTURES.filter((item) => item.category === category),
    [category],
  );
  const preview = useTexturePreview(source, selectedId, settings);
  const thumbnails = useTextureThumbnails(source);

  const replaceSource = useCallback((next: ImageSource | null) => {
    setSource((current) => {
      if (current !== next) releaseImage(current);
      sourceRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadImageFromUrl("/samples/studio-sample.svg", "studio-sample", true)
      .then((image) => {
        if (!cancelled && !sourceRef.current) replaceSource(image);
      })
      .catch(() => {
        if (!cancelled) setToast("The sample image could not be loaded. Choose your own image to begin.");
      });
    return () => {
      cancelled = true;
      releaseImage(sourceRef.current);
    };
  }, [replaceSource]);

  const openFiles = useCallback(async (files: FileList | File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      replaceSource(await loadImageFile(file));
      setToast(null);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The image could not be opened.");
    }
  }, [replaceSource]);

  const openPicker = useCallback(() => fileInputRef.current?.click(), []);

  const updateSettings = useCallback((patch: Partial<TextureSettings>) => {
    setSettingsById((current) => {
      historyRef.current.push({ id: selectedId, settings: { ...current[selectedId] } });
      if (historyRef.current.length > 40) historyRef.current.shift();
      return {
        ...current,
        [selectedId]: { ...current[selectedId], ...patch },
      };
    });
  }, [selectedId]);

  const undo = useCallback(() => {
    const previous = historyRef.current.pop();
    if (!previous) return;
    setSelectedId(previous.id);
    setSettingsById((current) => ({ ...current, [previous.id]: previous.settings }));
  }, []);

  const changeCategory = useCallback((next: "All" | TextureCategory) => {
    setCategory(next);
    const available = next === "All" ? TEXTURES : TEXTURES.filter((item) => item.category === next);
    if (!available.some((item) => item.id === selectedId) && available[0]) setSelectedId(available[0].id);
  }, [selectedId]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const image = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith("image/"));
      if (image) {
        event.preventDefault();
        void openFiles([image]);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [openFiles]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "o") {
        event.preventDefault();
        openPicker();
        return;
      }
      if (command && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (sourceRef.current) setExportOpen(true);
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        setRevealOriginal(true);
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const currentIndex = visibleTextures.findIndex((item) => item.id === selectedId);
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = visibleTextures[(currentIndex + direction + visibleTextures.length) % visibleTextures.length];
        if (next) {
          event.preventDefault();
          setSelectedId(next.id);
        }
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setRevealOriginal(false);
    };
    const onBlur = () => setRevealOriginal(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [openPicker, selectedId, visibleTextures]);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const requestInstall = useCallback(async () => {
    if (!installPrompt) {
      setInstallOpen(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setToast(choice.outcome === "accepted" ? "Grain Studio installation started." : "Installation was dismissed.");
  }, [installPrompt]);

  const exportImage = useCallback(async (format: ExportFormat, size: ExportSize, quality: number) => {
    if (!source) return;
    setExporting(true);
    setToast(null);
    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const requested = exportDimensions(source, size);
      const dimensions = fitWithin(requested.width, requested.height, 8192);
      const canvas = document.createElement("canvas");
      renderTexture(source.element, canvas, selectedId, settings, dimensions.width, dimensions.height);
      const blob = await canvasToBlob(canvas, format, quality);
      const filename = `${safeSlug(source.name)}-${safeSlug(texture.label)}.${extensionForFormat(format)}`;
      downloadBlob(blob, filename);
      setExportOpen(false);
      setToast(`Saved ${filename}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The image could not be exported.");
    } finally {
      setExporting(false);
    }
  }, [selectedId, settings, source, texture.label]);

  return (
    <main
      className="app-shell"
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        if (event.dataTransfer.types.includes("Files")) setDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragActive(false);
        void openFiles(event.dataTransfer.files);
      }}
    >
      <AppHeader
        compareEnabled={compareEnabled}
        canExport={Boolean(source)}
        isExporting={exporting}
        onCompareChange={setCompareEnabled}
        onExport={() => setExportOpen(true)}
        onInstall={() => void requestInstall()}
        repositoryUrl={import.meta.env.VITE_REPOSITORY_URL || "https://github.com/harshith-vaddiparthy/grain-studio"}
      />

      <div className="workspace-layout">
        <SourceRail source={source} onChoose={openPicker} onClear={() => replaceSource(null)} onUndo={undo} canUndo={historyRef.current.length > 0} />
        <div className="stage-column">
          <CanvasStage
            source={source}
            texture={texture}
            processedCanvasRef={preview.processedCanvasRef}
            originalCanvasRef={preview.originalCanvasRef}
            dimensions={preview.dimensions}
            compareEnabled={compareEnabled}
            compare={compare}
            revealOriginal={revealOriginal}
            status={preview.status}
            error={preview.error}
            dragActive={dragActive}
            onChoose={openPicker}
            onCompareChange={setCompare}
          />
          <TextureDock textures={visibleTextures} selected={selectedId} thumbnails={thumbnails} onSelect={setSelectedId} />
        </div>
        <Inspector
          texture={texture}
          settings={settings}
          category={category}
          onCategoryChange={changeCategory}
          onSettingsChange={updateSettings}
          onReset={() => updateSettings({ ...texture.defaults })}
          onRandomize={() => updateSettings({ seed: Math.floor(Math.random() * 10_000) })}
        />
      </div>

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        aria-label="Choose image file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          void openFiles(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
        }}
      />

      <ExportDialog open={exportOpen} source={source} texture={texture} exporting={exporting} onClose={() => setExportOpen(false)} onExport={exportImage} />
      <InstallDialog open={installOpen} onClose={() => setInstallOpen(false)} />
      <Toast message={toast ?? preview.error} onDismiss={() => setToast(null)} />
    </main>
  );
}
