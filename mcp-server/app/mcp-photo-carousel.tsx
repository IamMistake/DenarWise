"use client";

import Image from "next/image";
import { useRef, useState } from "react";

const slides = [
  {
    src: "/images/mcp-carousel/spaces.jpg",
    alt: "Claude listing three available HomeSpace spaces",
    label: "Find every shared space in one ask."
  },
  {
    src: "/images/mcp-carousel/add-shopping-items.jpg",
    alt: "Claude preparing six drinks and seven bananas for a HomeSpace shopping list",
    label: "Add a whole shopping list in one message."
  },
  {
    src: "/images/mcp-carousel/check-shopping-list.jpg",
    alt: "Claude showing an interactive HomeSpace shopping list with an item selected",
    label: "Check what’s needed — then clear the basket."
  }
] as const;

export function McpPhotoCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  function goToSlide(index: number) {
    const nextIndex = (index + slides.length) % slides.length;
    const track = trackRef.current;
    const slide = track?.children.item(nextIndex) as HTMLElement | null;

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
    <section className="editorial-carousel" aria-roledescription="carousel" aria-label="HomeSpace shopping lists in action">
      <div className="editorial-carousel-top">
        <span>Shopping lists in action</span>
        <span>{String(activeSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
      </div>

      <div
        className="editorial-carousel-track"
        ref={trackRef}
        onScroll={syncActiveSlide}
      >
        {slides.map((slide, index) => (
          <figure
            className="editorial-carousel-slide"
            key={slide.src}
            aria-label={`${index + 1} of ${slides.length}`}
            aria-hidden={index !== activeSlide}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={index === 0}
              sizes="(max-width: 650px) calc(100vw - 44px), 420px"
            />
            <figcaption>{slide.label}</figcaption>
          </figure>
        ))}
      </div>

      <div className="editorial-carousel-controls">
        <button type="button" onClick={() => goToSlide(activeSlide - 1)} aria-label="Previous photo">←</button>
        <div className="editorial-carousel-dots" aria-label="Choose a photo">
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
