"use client";

import { useState } from "react";

/** Product image gallery: one large image (fit, not cropped) + thumbnails to switch. */
export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return (
      <div className="item-photo">
        <div className="item-photo-ph" aria-hidden>
          ✝
        </div>
      </div>
    );
  }

  const current = images[Math.min(selected, images.length - 1)];

  return (
    <div className="item-gallery">
      <div className="item-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={alt} />
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((src, idx) => (
            <button
              key={src}
              type="button"
              className={`gallery-thumb ${idx === selected ? "active" : ""}`}
              onClick={() => setSelected(idx)}
              aria-label={`Show image ${idx + 1} of ${images.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
