import { DownloadSimple, GithubLogo, HardDrive, SlidersHorizontal, SquaresFour } from "@phosphor-icons/react";
import { BrandMark } from "./BrandMark";

export function AppHeader({
  compareEnabled,
  canExport,
  isExporting,
  onCompareChange,
  onExport,
  repositoryUrl,
}: {
  compareEnabled: boolean;
  canExport: boolean;
  isExporting: boolean;
  onCompareChange: (enabled: boolean) => void;
  onExport: () => void;
  repositoryUrl?: string;
}) {
  return (
    <header className="app-header">
      <a className="brand" href="#workspace" aria-label="Grain Studio home">
        <BrandMark />
        <span className="brand-copy">
          <strong>Grain Studio</strong>
          <small>Open texture workbench</small>
        </span>
      </a>

      <div className="view-switch" role="group" aria-label="Preview mode">
        <button type="button" className={!compareEnabled ? "is-active" : ""} aria-pressed={!compareEnabled} onClick={() => onCompareChange(false)}>
          <SlidersHorizontal size={15} aria-hidden="true" />
          Edit
        </button>
        <button type="button" className={compareEnabled ? "is-active" : ""} aria-pressed={compareEnabled} onClick={() => onCompareChange(true)}>
          <SquaresFour size={15} aria-hidden="true" />
          Compare
        </button>
      </div>

      <div className="header-actions">
        <span className="privacy-chip" title="Images never leave this browser">
          <HardDrive size={14} weight="fill" aria-hidden="true" />
          <span>Local only</span>
        </span>
        {repositoryUrl ? (
          <a className="icon-button header-github" href={repositoryUrl} target="_blank" rel="noreferrer" aria-label="Open the project source on GitHub" title="Source code">
            <GithubLogo size={19} weight="fill" aria-hidden="true" />
          </a>
        ) : null}
        <a
          className="product-hunt-badge"
          href="https://www.producthunt.com/products/grain-studio?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-grain-studio"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            alt="Grain Studio - Make tactile image textures in your browser for Free. | Product Hunt"
            width="250"
            height="54"
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1235901&theme=light&t=1788022149614"
          />
        </a>
        <button className="primary-button" type="button" disabled={!canExport || isExporting} onClick={onExport}>
          <DownloadSimple size={17} weight="bold" aria-hidden="true" />
          {isExporting ? "Rendering" : "Export"}
        </button>
      </div>
    </header>
  );
}
