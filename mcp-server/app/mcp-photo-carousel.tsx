"use client";

import Image from "next/image";
import { useRef, useState } from "react";

const slides = [
  {
    src: "/images/mcp-carousel/spaces.jpg",
    alt: "Claude listing three available DenarWise spaces",
    label: "Find every shared space in one ask."
  },
  {
    src: "/images/mcp-carousel/add-shopping-items.jpg",
    alt: "Claude showing a DenarWise review of Bitolsko milk and Zito protein bread before adding them to the ISO shopping list",
    label: "Add a whole shopping list in one message."
  },
  {
    src: "/images/mcp-carousel/check-shopping-list.jpg",
    alt: "Claude showing the shared ISO shopping list in DenarWise with milk and protein bread",
    label: "Check what’s needed, then clear the basket."
  }
] as const;

export function McpPhotoCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  function goToSlide(index: number) {
    const nextIndex = (index + slides.length) % slides.length;
    const slide = trackRef.current?.children.item(nextIndex) as HTMLElement | null;
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    setActiveSlide(nextIndex);
  }

  function syncActiveSlide() {
    const track = trackRef.current;
    if (!track) return;
    const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
    setActiveSlide(Math.min(slides.length - 1, Math.max(0, nextIndex)));
  }

  return (
    <section aria-roledescription="carousel" aria-label="DenarWise shopping lists in action">
      <div className="hs-carousel">
        <div className="hs-carousel-track" ref={trackRef} onScroll={syncActiveSlide}>
          {slides.map((slide, index) => (
            <figure
              className="hs-carousel-slide"
              key={slide.src}
              aria-label={`${index + 1} of ${slides.length}`}
              aria-hidden={index !== activeSlide}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={index === 0}
                sizes="(max-width: 680px) calc(100vw - 60px), 360px"
              />
              <figcaption>{slide.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="hs-carousel-controls">
        <button type="button" onClick={() => goToSlide(activeSlide - 1)} aria-label="Previous photo">←</button>
        <div className="hs-carousel-dots" aria-label="Choose a photo">
          {slides.map((slide, index) => (
            <button
              className={index === activeSlide ? "active" : undefined}
              key={slide.src}
              type="button"
              onClick={() => goToSlide(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === activeSlide ? "true" : undefined}
            />
          ))}
        </div>
        <button type="button" onClick={() => goToSlide(activeSlide + 1)} aria-label="Next photo">→</button>
      </div>
    </section>
  );
}
