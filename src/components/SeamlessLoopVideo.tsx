import { useEffect, useRef } from "react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
  /** Dissolve / float-out duration (seconds) */
  mistSeconds?: number;
  /** Empty 間 after fade, before reappearing (seconds) */
  gapSeconds?: number;
  /**
   * mist — hero style (fog wash)
   * float — gallery style (sink away, then float back up)
   */
  mode?: "mist" | "float";
};

/**
 * Play once → dissolve / sink → 間 → softly return (web-only, no extra libs).
 */
export function SeamlessLoopVideo({
  src,
  poster,
  className = "",
  mistSeconds = 1.35,
  gapSeconds = 1.6,
  mode = "mist",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mistRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const mist = mistRef.current;
    const wrap = wrapRef.current;
    if (!video || !wrap) return;

    let cycling = false;
    let raf = 0;
    let gapTimer = 0;
    let cancelled = false;

    video.muted = true;
    video.playsInline = true;
    video.loop = false;
    video.preload = "auto";
    video.style.opacity = "1";
    video.style.transform = "translateY(0) scale(1.18)";
    video.style.filter = "blur(0px)";
    if (mist) mist.style.opacity = "0";
    wrap.style.opacity = "1";

    const playSafe = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => undefined);
    };

    const ease = (t: number) => t * t * (3 - 2 * t);

    const animateMist = (
      fromA: number,
      toA: number,
      fromM: number,
      toM: number,
      durationMs: number,
      onDone?: () => void,
    ) => {
      if (!mist) {
        onDone?.();
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / durationMs);
        const e = ease(t);
        video.style.opacity = String(fromA + (toA - fromA) * e);
        mist.style.opacity = String(fromM + (toM - fromM) * e);
        if (t < 1) raf = requestAnimationFrame(step);
        else onDone?.();
      };
      raf = requestAnimationFrame(step);
    };

    const animateFloat = (
      from: { o: number; y: number; b: number },
      to: { o: number; y: number; b: number },
      durationMs: number,
      onDone?: () => void,
    ) => {
      const frame =
        (wrap.closest(".panel__img") as HTMLElement | null) ?? wrap.parentElement;
      const start = performance.now();
      const step = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / durationMs);
        const e = ease(t);
        const o = from.o + (to.o - from.o) * e;
        const y = from.y + (to.y - from.y) * e;
        const b = from.b + (to.b - from.b) * e;
        wrap.style.opacity = String(o);
        if (frame) frame.style.opacity = String(o);
        video.style.transform = `translateY(${y}px) scale(${1.16 + o * 0.02})`;
        video.style.filter = `blur(${b}px)`;
        if (t < 1) raf = requestAnimationFrame(step);
        else onDone?.();
      };
      raf = requestAnimationFrame(step);
    };

    const beginCycle = () => {
      if (cycling || cancelled) return;
      cycling = true;
      video.pause();

      if (mode === "float") {
        const frame =
          (wrap.closest(".panel__img") as HTMLElement | null) ?? wrap.parentElement;

        animateFloat({ o: 1, y: 0, b: 0 }, { o: 0, y: 28, b: 8 }, mistSeconds * 1000, () => {
          if (cancelled) return;
          video.currentTime = 0;
          // Keep the matte fully gone during 間 (no leftover rectangle)
          if (frame) {
            frame.style.opacity = "0";
            frame.style.pointerEvents = "none";
          }
          gapTimer = window.setTimeout(() => {
            if (cancelled) return;
            if (frame) frame.style.pointerEvents = "";
            wrap.style.opacity = "0";
            video.style.transform = "translateY(48px) scale(1.16)";
            video.style.filter = "blur(8px)";
            playSafe();
            animateFloat(
              { o: 0, y: 48, b: 8 },
              { o: 1, y: 0, b: 0 },
              mistSeconds * 1100,
              () => {
                cycling = false;
              },
            );
          }, gapSeconds * 1000);
        });
        return;
      }

      // mist mode (hero)
      animateMist(1, 0, 0, 1, mistSeconds * 1000, () => {
        if (cancelled) return;
        video.currentTime = 0;
        gapTimer = window.setTimeout(() => {
          if (cancelled) return;
          playSafe();
          animateMist(0, 1, 1, 0, mistSeconds * 1000, () => {
            cycling = false;
          });
        }, gapSeconds * 1000);
      });
    };

    const onTime = () => {
      if (!video.duration || cycling) return;
      if (video.duration - video.currentTime <= mistSeconds + 0.08) {
        beginCycle();
      }
    };

    const onEnded = () => {
      if (!cycling) beginCycle();
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnded);

    // Gallery scroll may call play() later; hero starts immediately.
    const start = () => {
      if (mode === "mist") playSafe();
    };
    if (video.readyState >= 2) start();
    else video.addEventListener("loadeddata", start, { once: true });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(gapTimer);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onEnded);
      video.pause();
    };
  }, [src, mistSeconds, gapSeconds, mode]);

  return (
    <div
      ref={wrapRef}
      className={`seamless-loop seamless-loop--${mode} ${className}`.trim()}
      data-breath="1"
    >
      <video
        ref={videoRef}
        className="seamless-loop__layer"
        src={src}
        poster={poster}
        muted
        playsInline
        preload="auto"
      />
      {mode === "mist" && (
        <div ref={mistRef} className="seamless-loop__mist" aria-hidden="true" />
      )}
    </div>
  );
}
