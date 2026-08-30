import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { CanvasStage } from "./components/CanvasStage";
import { ExportDialog } from "./components/ExportDialog";
import { Inspector } from "./components/Inspector";
import { SourceRail } from "./components/SourceRail";
import { TextureDock } from "./components/TextureDock";
import { Toast } from "./components/Toast";
import { STARTER_TEXTURE_IDS, TEXTURES, TEXTURE_BY_ID, texturesForFilter } from "./data/filters";
import { canvasToBlob, downloadBlob, exportDimensions, extensionForFormat, loadImageFile, loadImageFromUrl, releaseImage } from "./engine/image";
import { fitWithin } from "./engine/math";
import { renderTexture } from "./engine/render";
import { useTexturePreview, useTextureThumbnails } from "./hooks/useTexturePreview";
import { hasExportedBefore, initAnalytics, markExported, track } from "./lib/analytics";
import { decodeRecipe, encodeRecipe, readRecipeFromSearch, recipeLink } from "./lib/recipe";
import {
  addSavedLook,
  describeLook,
  loadSavedLooks,
  persistSavedLooks,
  removeSavedLook,
  type SavedLook,
} from "./lib/savedLooks";
import type { ExportFormat, ExportSize, ImageSource, TextureFilter, TextureId, TextureSettings } from "./types";

const initialSettings = () => Object.fromEntries(
  TEXTURES.map((texture) => [texture.id, { ...texture.defaults }]),
) as Record<TextureId, TextureSettings>;

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "texture";
}

/* Read once, before first paint, so an arriving recipe becomes the initial state
   instead of replacing a wrong effect a frame later. */
const incomingRecipe = typeof window === "undefined" ? null : readRecipeFromSearch(window.location.search);

/* New visitors open on the curated set so they choose between six recognisable
   jobs rather than twenty-five invented names. A shared recipe for an effect
   outside that set opens on the full catalog, so the arriving look is visible. */
const initialCategory: TextureFilter =
  incomingRecipe && !STARTER_TEXTURE_IDS.includes(incomingRecipe.textureId) ? "All" : "Start here";

export default function App() {
  const [source, setSource] = useState<ImageSource | null>(null);
  const sourceRef = useRef<ImageSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const historyRef = useRef<Array<{ id: TextureId; settings: TextureSettings }>>([]);

  const [selectedId, setSelectedId] = useState<TextureId>(incomingRecipe?.textureId ?? "riso-print");
  const [settingsById, setSettingsById] = useState(() => {
    const base = initialSettings();
    if (incomingRecipe) base[incomingRecipe.textureId] = { ...incomingRecipe.settings };
    return base;
  });
  const [category, setCategory] = useState<TextureFilter>(initialCategory);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compare, setCompare] = useState(50);
  const [revealOriginal, setRevealOriginal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>(() =>
    typeof window === "undefined" ? [] : loadSavedLooks(),
  );

  const texture = TEXTURE_BY_ID[selectedId];
  const settings = settingsById[selectedId];
  const visibleTextures = useMemo(() => texturesForFilter(category), [category]);
  const preview = useTexturePreview(source, selectedId, settings);
  const thumbnails = useTextureThumbnails(source);

  const replaceSource = useCallback((next: ImageSource | null) => {
    setSource((current) => {
      if (current !== next) releaseImage(current);
      sourceRef.current = next;
      return next;
    });
  }, []);

  /* Session bootstrap. Mount-only by design: it records the arrival, not any
     later state, so it deliberately does not react to selection changes. */
  useEffect(() => {
    initAnalytics();
    track("app_opened");
    if (incomingRecipe) {
      track("recipe_link_opened", {
        effect_id: incomingRecipe.textureId,
        palette: incomingRecipe.settings.palette,
        recipe: encodeRecipe(incomingRecipe.textureId, incomingRecipe.settings),
      });
    }
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
      /* Records only that a custom image was chosen. No filename, byte size,
         MIME type, or pixel dimension is collected. */
      track("custom_image_selected");
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

  /* Effect selection is tracked here rather than in an effect on selectedId, so
     an arriving recipe or a category fallback is never counted as a deliberate
     user choice. */
  const selectTexture = useCallback((next: TextureId) => {
    setSelectedId(next);
    track("effect_applied", { effect_id: next, effect_category: TEXTURE_BY_ID[next].category });
  }, []);

  const changeCategory = useCallback((next: TextureFilter) => {
    setCategory(next);
    const available = texturesForFilter(next);
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
          selectTexture(next.id);
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
  }, [openPicker, selectTexture, selectedId, visibleTextures]);

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
      /* The value moment. `source_kind` separates trying the bundled sample from
         treating a real image, which is the activation signal that matters.
         `export_size` is the chosen preset, never the resulting pixel count. */
      const firstExport = !hasExportedBefore();
      track("export_completed", {
        effect_id: selectedId,
        effect_category: texture.category,
        palette: settings.palette,
        recipe: encodeRecipe(selectedId, settings),
        source_kind: source.isSample ? "sample" : "custom",
        is_first_export: firstExport,
        export_format: format,
        export_size: size,
        adjusted: encodeRecipe(selectedId, settings) !== encodeRecipe(selectedId, texture.defaults),
      });
      if (firstExport) markExported();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The image could not be exported.");
    } finally {
      setExporting(false);
    }
  }, [selectedId, settings, source, texture.category, texture.defaults, texture.label]);

  /* The acquisition loop. The link carries the effect and its settings only, so a
     recipient opens the same look and applies it to their own image. */
  const shareRecipe = useCallback(async () => {
    const link = recipeLink(window.location.origin, selectedId, settings);
    try {
      await navigator.clipboard.writeText(link);
      setToast("Look link copied. It carries the settings only, never your image.");
    } catch {
      setToast(link);
    }
    track("recipe_copied", {
      effect_id: selectedId,
      effect_category: texture.category,
      palette: settings.palette,
      recipe: encodeRecipe(selectedId, settings),
    });
  }, [selectedId, settings, texture.category]);

  /* Retention. A saved look is the same recipe string kept in this browser, so
     returning to a treatment costs one click and never needs an account. */
  const saveLook = useCallback(() => {
    const look = describeLook(selectedId, settings);
    const next = addSavedLook(savedLooks, look);
    setSavedLooks(next);
    persistSavedLooks(next);
    track("look_saved", {
      effect_id: selectedId,
      effect_category: texture.category,
      palette: settings.palette,
      recipe: look.recipe,
      saved_look_count: next.length,
    });
    setToast(`Saved "${look.label}" to this browser.`);
  }, [savedLooks, selectedId, settings, texture.category]);

  const applySavedLook = useCallback((recipe: string) => {
    const decoded = decodeRecipe(recipe);
    if (!decoded) return;
    setSettingsById((current) => ({ ...current, [decoded.textureId]: { ...decoded.settings } }));
    setSelectedId(decoded.textureId);
    /* Reveal the effect if the current group would hide it. */
    setCategory((current) =>
      texturesForFilter(current).some((item) => item.id === decoded.textureId) ? current : "All",
    );
    track("saved_look_opened", {
      effect_id: decoded.textureId,
      effect_category: TEXTURE_BY_ID[decoded.textureId].category,
      palette: decoded.settings.palette,
      recipe,
    });
  }, []);

  const forgetSavedLook = useCallback((recipe: string) => {
    const next = removeSavedLook(savedLooks, recipe);
    setSavedLooks(next);
    persistSavedLooks(next);
  }, [savedLooks]);

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
          <TextureDock textures={visibleTextures} selected={selectedId} thumbnails={thumbnails} onSelect={selectTexture} />
        </div>
        <Inspector
          texture={texture}
          settings={settings}
          category={category}
          onCategoryChange={changeCategory}
          onSettingsChange={updateSettings}
          onReset={() => updateSettings({ ...texture.defaults })}
          onRandomize={() => updateSettings({ seed: Math.floor(Math.random() * 10_000) })}
          onShare={() => void shareRecipe()}
          savedLooks={savedLooks}
          onSaveLook={saveLook}
          onApplySavedLook={applySavedLook}
          onForgetSavedLook={forgetSavedLook}
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
      <Toast message={toast ?? preview.error} onDismiss={() => setToast(null)} />
    </main>
  );
}
