import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSuminagashi,
  type InkKey,
  type SuminagashiApi,
} from "./engine";
import { downloadCanvas, drawHanko } from "./hanko";
import "./suminagashi.css";

type Props = {
  onBack: () => void;
};

type Phase = "play" | "transfer" | "seal" | "done";

type SealMark = {
  x: number;
  y: number;
  angle: number;
  size: number;
};

const INKS: { key: InkKey; label: string; className: string }[] = [
  { key: "cycle", label: "巡", className: "ink-cycle" },
  { key: "sumi", label: "墨", className: "ink-sumi" },
  { key: "ai", label: "藍", className: "ink-ai" },
  { key: "shu", label: "朱", className: "ink-shu" },
  { key: "matsuba", label: "松葉", className: "ink-matsuba" },
];

export function SuminagashiGame({ onBack }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<SuminagashiApi | null>(null);
  const baseArtRef = useRef<HTMLCanvasElement | null>(null);

  const [inkMode, setInkMode] = useState<InkKey>("cycle");
  const [autoOn, setAutoOn] = useState(true);
  const [hintGone, setHintGone] = useState(false);
  const [phase, setPhase] = useState<Phase>("play");
  const [seals, setSeals] = useState<SealMark[]>([]);
  const [ghost, setGhost] = useState<{ x: number; y: number; angle: number } | null>(
    null,
  );
  const ghostAngle = useRef(-6 + Math.random() * 12);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const api = createSuminagashi(host, {
      onFirstInteract: () => setHintGone(true),
    });
    apiRef.current = api;

    const hintTimer = window.setTimeout(() => setHintGone(true), 9000);

    return () => {
      clearTimeout(hintTimer);
      api.dispose();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.setInkMode(inkMode);
  }, [inkMode]);

  useEffect(() => {
    apiRef.current?.setAuto(autoOn && phase === "play");
  }, [autoOn, phase]);

  const paintArt = useCallback((marks: SealMark[]) => {
    const base = baseArtRef.current;
    const art = artRef.current;
    if (!base || !art) return;
    art.width = base.width;
    art.height = base.height;
    const ctx = art.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, art.width, art.height);
    ctx.drawImage(base, 0, 0);
    for (const s of marks) {
      drawHanko(ctx, s.x, s.y, s.size, s.angle);
    }
  }, []);

  useEffect(() => {
    if (phase === "seal" || phase === "done") {
      requestAnimationFrame(() => paintArt(seals));
    }
  }, [phase, seals, paintArt]);

  const startTransfer = () => {
    const api = apiRef.current;
    if (!api || phase !== "play") return;
    setHintGone(true);
    setPhase("transfer");
    api.setPaused(true);
    api.setAuto(false);

    window.setTimeout(() => {
      const frame = api.captureFrame();
      if (!frame) {
        api.setPaused(false);
        setPhase("play");
        return;
      }
      baseArtRef.current = frame;
      setSeals([]);
      ghostAngle.current = -8 + Math.random() * 16;
      setPhase("seal");
      // paint after art canvas mounts
      requestAnimationFrame(() => paintArt([]));
    }, 1100);
  };

  const onArtPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "seal") return;
    const canvas = artRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    setGhost({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      angle: ghostAngle.current,
    });
  };

  const onArtPointerLeave = () => {
    if (phase === "seal") setGhost(null);
  };

  const onArtClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "seal") return;
    const canvas = artRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const size = Math.min(canvas.width, canvas.height) * 0.085;
    const angle = ghostAngle.current + (Math.random() - 0.5) * 4;
    const next = [...seals, { x, y, angle, size }];
    setSeals(next);
    setGhost(null);
    setPhase("done");
  };

  const saveWork = () => {
    const art = artRef.current;
    if (!art) return;
    const stamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-");
    downloadCanvas(art, `suminagashi-${stamp}.png`);
  };

  const again = () => {
    setSeals([]);
    setGhost(null);
    baseArtRef.current = null;
    setPhase("play");
    apiRef.current?.setPaused(false);
    apiRef.current?.setAuto(autoOn);
  };

  const showArt = phase === "seal" || phase === "done";
  const showDock = phase === "play";

  return (
    <div className={`sumi-game sumi-game--${phase}`}>
      <div
        className="sumi-game__canvas"
        ref={hostRef}
        style={{ opacity: showArt ? 0 : 1, pointerEvents: showArt ? "none" : "auto" }}
      />

      {showArt && (
        <div className="sumi-art">
          <canvas
            ref={artRef}
            className="sumi-art__canvas"
            onPointerMove={onArtPointerMove}
            onPointerLeave={onArtPointerLeave}
            onClick={onArtClick}
          />
          {phase === "seal" && ghost && artRef.current && (
            <div
              className="sumi-ghost-seal"
              style={{
                left: `${(ghost.x / artRef.current.width) * 100}%`,
                top: `${(ghost.y / artRef.current.height) * 100}%`,
                width: `${(Math.min(artRef.current.width, artRef.current.height) * 0.085) / artRef.current.width * 100}%`,
                transform: `translate(-50%, -50%) rotate(${ghost.angle}deg)`,
              }}
            >
              山
            </div>
          )}
        </div>
      )}

      {phase === "transfer" && (
        <div className="sumi-paper" aria-hidden="true">
          <div className="sumi-paper__sheet">
            <span>和紙をのせる</span>
          </div>
        </div>
      )}

      <div className="sumi-title">
        <h1>墨流し</h1>
        <div className="sumi-title__sub">水面に墨を流し、模様をうつす</div>
      </div>

      <button type="button" className="sumi-back" onClick={onBack}>
        ← 山水へ戻る
      </button>

      {phase === "play" && (
        <div className={`sumi-hint ${hintGone ? "gone" : ""}`}>
          画 面 を な ぞ っ て 墨 を 流 す
        </div>
      )}
      {phase === "seal" && (
        <div className="sumi-hint sumi-hint--persist">
          好 印 を 押 し て 完 成 に す る
        </div>
      )}
      {phase === "done" && (
        <div className="sumi-hint sumi-hint--persist">完 成</div>
      )}

      {showDock && (
        <div className="sumi-dock" role="toolbar" aria-label="墨の操作">
          <div className="sumi-inks">
            {INKS.map((ink) => (
              <button
                key={ink.key}
                type="button"
                className={`sumi-ink ${ink.className}`}
                aria-pressed={inkMode === ink.key}
                onClick={() => setInkMode(ink.key)}
              >
                <span className="sumi-ink__lbl">{ink.label}</span>
              </button>
            ))}
          </div>
          <div className="sumi-sep" />
          <button
            type="button"
            className="sumi-act"
            aria-pressed={autoOn}
            title="放置中の自動滴下と水流のオン/オフ"
            onClick={() => setAutoOn((v) => !v)}
          >
            <span className="sumi-act__dot" />
            自動演出
          </button>
          <button
            type="button"
            className="sumi-act"
            title="インクを徐々に洗い流す"
            onClick={() => apiRef.current?.wash()}
          >
            洗い流す
          </button>
          <div className="sumi-sep" />
          <button
            type="button"
            className="sumi-act sumi-act--primary"
            title="今の模様を和紙に写す"
            onClick={startTransfer}
          >
            和紙に写す
          </button>
        </div>
      )}

      {(phase === "seal" || phase === "done") && (
        <div className="sumi-dock sumi-dock--finish" role="toolbar" aria-label="作品の操作">
          {phase === "done" && (
            <button type="button" className="sumi-act sumi-act--primary" onClick={saveWork}>
              保存する
            </button>
          )}
          {phase === "seal" && (
            <span className="sumi-dock__note">好きな位置をクリック</span>
          )}
          <button type="button" className="sumi-act" onClick={again}>
            もう一度流す
          </button>
        </div>
      )}
    </div>
  );
}
