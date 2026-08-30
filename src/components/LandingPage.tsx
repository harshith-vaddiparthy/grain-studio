import { ArrowUpRight, GithubLogo, LockSimple, Sparkle } from "@phosphor-icons/react";
import { studioHref } from "../navigation";
import { BrandMark } from "./BrandMark";

const productHuntUrl = "https://www.producthunt.com/products/grain-studio?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-grain-studio";

export function LandingPage() {
  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <a className="landing-brand" href="/" aria-label="Grain Studio home">
          <BrandMark />
          <span>
            <strong>Grain Studio</strong>
            <small>Open texture workbench</small>
          </span>
        </a>
        <div className="landing-nav__actions">
          <a className="landing-source" href="https://github.com/harshith-vaddiparthy/grain-studio" target="_blank" rel="noreferrer">
            <GithubLogo size={18} weight="fill" aria-hidden="true" />
            Source
          </a>
          <a className="landing-open" href={studioHref()}>
            Open studio <ArrowUpRight size={17} weight="bold" aria-hidden="true" />
          </a>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <p className="landing-kicker"><Sparkle size={14} weight="fill" aria-hidden="true" /> 25 tactile effects. One browser tab.</p>
          <h1 id="landing-title">Make images feel <em>made.</em></h1>
          <p className="landing-intro">Grain Studio is a local-first texture workbench for designers, illustrators, and indie creators. Add tactile character, tune the material, then export—without sending your source image to a cloud editor.</p>
          <div className="landing-cta-row">
            <a className="landing-primary" href={studioHref()}>Open Grain Studio <ArrowUpRight size={18} weight="bold" aria-hidden="true" /></a>
            <a className="landing-product-hunt" href={productHuntUrl} target="_blank" rel="noopener noreferrer" aria-label="View Grain Studio on Product Hunt">
              <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1235901&theme=light&t=1788022149614" width="250" height="54" alt="Grain Studio featured on Product Hunt" />
            </a>
          </div>
          <div className="landing-trust"><LockSimple size={15} weight="fill" aria-hidden="true" /> Your images stay in this browser. Always.</div>
        </div>

        <figure className="landing-desktop-shot">
          <img src="/screenshots/editor-desktop.png" alt="Grain Studio editor applying a Riso Print texture to an illustration" />
          <figcaption>Riso Print, live controls, and export-ready output.</figcaption>
        </figure>
      </section>

      <section className="landing-proof" aria-label="Product highlights">
        <article><strong>25</strong><span>original texture effects</span></article>
        <article><strong>0</strong><span>image uploads or accounts</span></article>
        <article><strong>3</strong><span>export formats: PNG, JPEG, WebP</span></article>
      </section>

      <section className="landing-mobile" aria-labelledby="mobile-title">
        <div>
          <p className="landing-kicker">Made for the moment</p>
          <h2 id="mobile-title">A real studio, even on a small screen.</h2>
          <p>Drop in an image, move through the texture dock, adjust the material, and export when it feels right.</p>
          <a className="landing-inline-link" href={studioHref()}>Try the editor <ArrowUpRight size={16} weight="bold" aria-hidden="true" /></a>
        </div>
        <img src="/screenshots/editor-mobile.png" alt="Grain Studio texture editor on a mobile phone" />
      </section>
    </main>
  );
}
