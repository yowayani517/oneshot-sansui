import { useEffect, useState } from "react";

type Props = {
  videoSrc: string;
  stillSrc: string;
  className: string;
  alt?: string;
  loop?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  onResolved?: (kind: "video" | "still") => void;
};

/** Prefer Flow MP4; fall back to still only if the video fails to load. */
export function MediaOrStill({
  videoSrc,
  stillSrc,
  className,
  alt = "",
  loop = false,
  autoPlay = false,
  muted = true,
  onResolved,
}: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onResolved?.(failed ? "still" : "video");
  }, [failed, onResolved]);

  if (failed) {
    return <img className={className} src={stillSrc} alt={alt} />;
  }

  return (
    <video
      className={className}
      src={videoSrc}
      poster={stillSrc}
      playsInline
      preload="auto"
      muted={muted}
      loop={loop}
      autoPlay={autoPlay}
      onError={() => setFailed(true)}
    />
  );
}
