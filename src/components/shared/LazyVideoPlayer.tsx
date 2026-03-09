"use client";

import { useState } from "react";
import { Play } from "lucide-react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
};

export function LazyVideoPlayer({ src, poster, className }: Props) {
  const [enabled, setEnabled] = useState(false);

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => setEnabled(true)}
        className={`relative w-full overflow-hidden rounded bg-black ${className ?? ""}`}
        aria-label="Play video"
      >
        {poster ? (
          <img src={poster} alt="Video preview" className="h-auto w-full" />
        ) : (
          <div className="aspect-video w-full bg-black" />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-3 py-1 text-xs font-medium text-white">
            <Play className="h-3.5 w-3.5 fill-white" />
            Play
          </span>
        </span>
      </button>
    );
  }

  return (
    <video
      className={`h-auto w-full rounded bg-black ${className ?? ""}`}
      controls
      preload="metadata"
      playsInline
      poster={poster}
    >
      <source src={src} />
    </video>
  );
}

