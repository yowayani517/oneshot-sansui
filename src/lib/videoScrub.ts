import gsap from "gsap";

/** Soft-seek video time toward a target (reduces scrub stutter). */
export function createVideoScrubber(video: HTMLVideoElement) {
  let target = 0;
  let running = true;

  const tick = () => {
    if (!running) return;
    if (!video.duration || Number.isNaN(video.duration)) return;
    if (video.seeking) return;

    const diff = target - video.currentTime;
    if (Math.abs(diff) < 0.04) return;

    video.currentTime = target;
  };

  gsap.ticker.add(tick);

  return {
    setProgress(progress: number, opts?: { pingPong?: boolean; pad?: number }) {
      if (!video.duration) return;
      const pad = opts?.pad ?? 0.04;
      let p = clamp(progress, 0, 1);

      if (opts?.pingPong) {
        // 0→1→0 so the clip never hard-stops at the end
        p = p < 0.5 ? p * 2 : (1 - p) * 2;
      }

      // Keep off the abrupt first/last frames
      const inner = pad + p * (1 - pad * 2);
      target = inner * Math.max(0, video.duration - 0.05);
    },
    destroy() {
      running = false;
      gsap.ticker.remove(tick);
    },
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Smoothstep — eases scrub into / out of the clip. */
export function softProgress(progress: number) {
  const p = clamp(progress, 0, 1);
  return p * p * (3 - 2 * p);
}
