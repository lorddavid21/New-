"use client";

import { useState } from "react";

type GalleryImage = { storage_path: string; alt_text: string | null };

export function PropertyGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!images.length) return <div className="detail-gallery-empty">Property photographs are unavailable.</div>;

  const active = images[activeIndex];
  return (
    <div className="detail-gallery">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="gallery-main-image" src={active.storage_path} alt={active.alt_text ?? title} />
      {images.length > 1 && <div className="gallery-thumbnails" role="group" aria-label="Property photographs">
        {images.map((image, index) => (
          <button
            className={index === activeIndex ? "gallery-thumbnail active" : "gallery-thumbnail"}
            type="button"
            key={`${image.storage_path}-${index}`}
            aria-label={`Show photograph ${index + 1} of ${images.length}`}
            aria-pressed={index === activeIndex}
            onClick={() => setActiveIndex(index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.storage_path} alt="" loading="lazy" />
          </button>
        ))}
      </div>}
    </div>
  );
}
