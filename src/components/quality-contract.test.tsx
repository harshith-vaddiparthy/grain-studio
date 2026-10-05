import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppHeader } from "./AppHeader";
import { CanvasStage } from "./CanvasStage";
import { TEXTURE_BY_ID } from "../data/filters";

const noop = () => {};

describe("editor quality contract", () => {
  it("credits Harshith Vaddiparthy in a real visible profile link", () => {
    const html = renderToStaticMarkup(<AppHeader compareEnabled={false} canExport isExporting={false} onCompareChange={noop} onExport={noop} repositoryUrl="https://github.com/harshith-vaddiparthy/grain-studio" />);
    expect(html).toContain("Harshith Vaddiparthy");
    expect(html).toContain('href="https://www.harshith.com/"');
    expect(html).toContain("creator-link");
  });

  it("exposes replacement and touch comparison even while a sample is loaded", () => {
    const html = renderToStaticMarkup(<CanvasStage source={{ element: {} as HTMLImageElement, width: 1280, height: 853, name: "sample", isSample: true }} texture={TEXTURE_BY_ID["riso-print"]} processedCanvasRef={{ current: null }} originalCanvasRef={{ current: null }} dimensions={{ width: 1280, height: 853 }} compareEnabled={false} compare={50} revealOriginal={false} status="ready" error={null} dragActive={false} onChoose={noop} onCompareChange={noop} />);
    expect(html).toContain("stage-image-actions");
    expect(html).toContain("Replace image");
    expect(html).toContain("Compare");
  });
});
