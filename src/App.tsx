import { useCallback, useEffect, useRef, useState } from "react";
import { MediaOrStill } from "./components/MediaOrStill";
import { SeamlessLoopVideo } from "./components/SeamlessLoopVideo";
import { useScrollExperience } from "./hooks/useScrollExperience";
import { splitChars } from "./lib/splitText";
import { SuminagashiGame } from "./suminagashi/SuminagashiGame";

/** Bump when Flow videos are replaced so browsers skip stale cache. */
const V = "20260711g";

const MEDIA_SLOTS = ["hero", "scrub", "still"] as const;

type View = "cover" | "game";

export default function App() {
  const [view, setView] = useState<View>("cover");
  const seen = useRef(new Set<string>());
  const [ready, setReady] = useState(false);
  const markResolved = useCallback((slot: string) => {
    seen.current.add(slot);
    if (seen.current.size >= MEDIA_SLOTS.length) setReady(true);
  }, []);
  useScrollExperience(view === "cover" && ready);

  useEffect(() => {
    markResolved("hero");
  }, [markResolved]);

  // Never leave the paper-white loader stuck on WebView / slow media.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = view === "game" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [view]);

  if (view === "game") {
    return <SuminagashiGame onBack={() => setView("cover")} />;
  }

  const enterGame = () => setView("game");

  return (
    <>
      <div className="loader">
        <div className="loader__seal">山</div>
        <div className="loader__bar">
          <span />
        </div>
      </div>

      <div className="grain" aria-hidden="true" />

      <nav className="nav">
        <a className="nav__mark" href="#top">
          山水
          <span>教えと絵</span>
        </a>
        <div className="nav__links">
          <a href="#garden">絵解き</a>
          <a href="#craft">鶴</a>
          <a href="#spirit">教え</a>
          <button type="button" className="nav__cta" onClick={enterGame}>
            墨流し
          </button>
        </div>
      </nav>

      <main>
        <header className="hero" id="top">
          <SeamlessLoopVideo
            className="hero__media"
            src={`videos/hero-dragon.mp4?v=${V}`}
            poster="stills/hero-dragon.png"
            mistSeconds={1.4}
            gapSeconds={1.8}
          />
          <div className="hero__wash" />
          <div className="hero__vertical" aria-hidden="true">
            登竜門
          </div>
          <div className="hero__content">
            <p className="hero__kicker reveal-line">
              <span>墨絵で読む、昔の教え</span>
            </p>
            <h1 className="hero__title" aria-label="山水">
              {splitChars("山水")}
            </h1>
            <p className="hero__sub reveal-line">
              <span>雲に乗れば、人も竜になれる。</span>
            </p>
          </div>
          <div className="hero__scroll">
            <span>下へ</span>
            <i />
          </div>
        </header>

        <section className="poem" id="spirit">
          <p className="poem__jp" aria-hidden="true">
            大器晩成
          </p>
          <h2 className="poem__text">
            <span className="line">
              <span>
                急がなくていい。<em>山は、黙って大きくなる。</em>
              </span>
            </span>
            <span className="line">
              <span>
                一度乾いても、<em>竜の夢は消えない。</em>
              </span>
            </span>
          </h2>
          <div className="poem__seal">教え</div>
        </section>

        <section className="scrub" id="craft">
          <div className="scrub__pin">
            <div className="bleed-crop scrub__bleed">
              <MediaOrStill
                className="scrub__media"
                videoSrc={`videos/scrub-cranes.mp4?v=${V}`}
                stillSrc="stills/scrub-cranes-walk.png"
                alt="霧の水辺で鶴が舞い、杖をついた旅人が歩く"
                onResolved={() => markResolved("scrub")}
              />
            </div>
            <div className="scrub__edge" aria-hidden="true" />
            <div className="scrub__kanji" aria-hidden="true">
              鶴
            </div>
            <div className="scrub__caption">
              <span className="scrub__num">一</span>
              <h3>鶴は千年</h3>
              <p>
                長く生きる秘訣は、あわてないこと。
                スクロールすると、鶴と旅人がゆっくり動きます。
              </p>
            </div>
          </div>
        </section>

        <section className="gallery" id="garden">
          <div className="gallery__head">
            <span className="gallery__jp">絵解き</span>
            <h2 aria-label="教え">{splitChars("教え")}</h2>
          </div>

          <div className="panel panel--left">
            <figure className="panel__img panel__img--landscape">
              <div className="panel__crop">
                <SeamlessLoopVideo
                  className="panel__media"
                  src={`videos/gallery-koi.mp4?v=${V}`}
                  poster="stills/gallery-koi.png"
                  mode="float"
                  mistSeconds={1.5}
                  gapSeconds={2.2}
                />
              </div>
            </figure>
            <div className="panel__text">
              <span className="panel__num">二</span>
              <h3>鯉の滝登り</h3>
              <p>
                逆流しても、のぼりつづければ竜になれる。
                あきらめない心を、鯉は教えてくれる。
              </p>
              <a className="panel__link" href="#visit">
                墨を流してみる <i>→</i>
              </a>
            </div>
          </div>

          <div className="panel panel--right">
            <figure className="panel__img panel__img--landscape">
              <div className="panel__crop">
                <SeamlessLoopVideo
                  className="panel__media"
                  src={`videos/gallery-tiger.mp4?v=${V}`}
                  poster="stills/gallery-tiger.png"
                  mode="float"
                  mistSeconds={1.5}
                  gapSeconds={2.2}
                />
              </div>
            </figure>
            <div className="panel__text">
              <span className="panel__num">三</span>
              <h3>虎は千里を行く</h3>
              <p>
                本当の強さは、吠えないところにある。
                静かに、自分の道を歩け、ということ。
              </p>
              <a className="panel__link" href="#visit">
                墨を流してみる <i>→</i>
              </a>
            </div>
          </div>
        </section>

        <section className="still">
          <div className="still__pin">
            <div className="bleed-crop still__bleed">
              <MediaOrStill
                className="still__media"
                videoSrc={`videos/still-horse.mp4?v=${V}`}
                stillSrc="stills/still-horse.png"
                alt="山霧を駆ける墨絵の馬"
                onResolved={() => markResolved("still")}
              />
            </div>
            <div className="still__veil" />
            <div className="still__content">
              <p className="still__jp" aria-hidden="true">
                鞍上人なく鞍下馬なし
              </p>
              <h2 aria-label="急がば回れ">
                {splitChars("急がば回れ")}
              </h2>
              <p className="still__sub">
                馬は、近道より確かな道を知っている。
                急ぐときほど、回り道が近道になる。
              </p>
            </div>
          </div>
        </section>

        <footer className="cta" id="visit">
          <div className="cta__inner">
            <span className="cta__jp">さいごに</span>
            <h2 aria-label="百聞は一見に如かず">
              {splitChars("百聞は一見に如かず")}
            </h2>
            <p>
              聞くより、触れてみる。
              <br />
              指で墨を流して、自分の模様をつくろう。
            </p>
            <button type="button" className="cta__btn" onClick={enterGame}>
              <span>墨流しをはじめる</span>
            </button>
          </div>
          <div className="cta__foot">
            <span>© 2026 山水</span>
            <span className="cta__seal">山</span>
            <span>絵は教え、教えは絵</span>
          </div>
        </footer>
      </main>
    </>
  );
}
