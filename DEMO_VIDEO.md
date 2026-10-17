# Replace the second slide with a real MP4

The presentation is at **`/demo`**. Its second slide (`#watch`) currently uses a scripted React phone animation. Follow these steps to replace the animated phone with a real recording and keep the side captions synchronized with the video.

## Files to edit

| File | Change |
| --- | --- |
| `mcp-server/public/videos/denarwise-demo.mp4` | Add your recording here. |
| `mcp-server/app/demo/demo-experience.tsx` | Replace the animated phone and connect video playback. |
| `mcp-server/app/demo/demo.module.css` | Add the video sizing styles. |

## 1. Add the recording

Create `mcp-server/public/videos/` and put your MP4 inside:

```text
mcp-server/public/videos/denarwise-demo.mp4
```

Next.js serves that file at **`/videos/denarwise-demo.mp4`**. Do not include `public` or `mcp-server` in the browser URL.

Use a portrait recording for the existing phone-centered layout. Export as **MP4 with H.264 video**, and AAC audio if the recording has sound. Crop out unrelated desktop content and leave time to read each result.

## 2. Add a video ref

In `DemoExperience`, next to the existing `deck` ref, add:

```tsx
const demoVideo = useRef<HTMLVideoElement>(null);
```

`useRef` is already imported.

## 3. Replace the animated phone

Find the second slide:

```tsx
<section id="watch" ...>
```

Inside its `styles.demoStage` container, replace the **entire central `<div className={styles.phone} ...>...</div>`**, including its status bar, header, phone panels, and composer, with:

```tsx
<video
  ref={demoVideo}
  className={styles.recordedVideo}
  aria-label="DenarWise mobile demo recording"
  controls
  muted
  playsInline
  loop
  preload="metadata"
  onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
  onPlay={() => setPaused(false)}
  onPause={() => setPaused(true)}
>
  <source src="/videos/denarwise-demo.mp4" type="video/mp4" />
  Your browser does not support video playback.
</video>
```

The two `<aside>` caption elements stay on either side of this video. `muted` enables automatic playback in most browsers, and `playsInline` keeps mobile browsers from forcing their own fullscreen player. Native controls let the viewer play the recording if autoplay is blocked or enable sound if needed.

## 4. Replace the simulated playback clock

Find and remove both existing effects:

- The effect containing `setTime(0); setPaused(false);` with `[active]` as its dependency.
- The effect containing `setInterval` and `(value + delta) % 40`.

Replace them with this effect inside `DemoExperience`:

```tsx
useEffect(() => {
  const video = demoVideo.current;
  if (!video) return;

  let cancelled = false;
  video.pause();
  video.currentTime = 0;
  setTime(0);

  if (active === 1) {
    void video.play().catch(() => {
      // The native Play control is available if autoplay is blocked.
      if (!cancelled) setPaused(true);
    });
  }

  return () => {
    cancelled = true;
    video.pause();
  };
}, [active]);
```

Slide indexes are zero-based: **`active === 1` is the second slide**. This starts the recording when entering that slide, pauses it when leaving, and restarts it on the next visit. The `loop` attribute handles replay.

The video’s `currentTime` now drives captions and progress. Keep the simulated interval removed so two different clocks cannot get out of sync.

## 5. Connect the footer’s Pause / Resume button

Add this function inside `DemoExperience`, before its `return`:

```tsx
function toggleVideoPlayback() {
  const video = demoVideo.current;
  if (!video) return;

  if (video.paused) {
    void video.play().catch(() => setPaused(true));
  } else {
    video.pause();
  }
}
```

In the footer button with `className={styles.pauseButton}`, replace:

```tsx
onClick={() => setPaused(!paused)}
```

with:

```tsx
onClick={toggleVideoPlayback}
```

Keep its existing visible label and change the `aria-label` to:

```tsx
aria-label={paused ? "Resume demo video" : "Pause demo video"}
```

The video’s `onPlay` and `onPause` handlers update the labels whether playback changes through the footer or the native video controls.

## 6. Match the captions to your recording

The `scenes` array near the top of the file controls the side captions. Its current timing is:

| Scene | Start | End |
| --- | ---: | ---: |
| Your spaces | 0 s | 8 s |
| Add products | 8 s | 21 s |
| The full list | 21 s | 30 s |
| Sale alert | 30 s | 40 s |

Update the `start` and `end` values to match the actual moments in your MP4. Keep the entries in order, start the first at `0`, and make the final `end` match the recording’s duration. Update the caption text to describe what you actually recorded.

Replace the existing `scene`, `currentScene`, and `current` declarations with:

```tsx
const currentScene = scenes.reduce(
  (latest, scene, index) => (time >= scene.start ? index : latest),
  0
);
const current = scenes[currentScene];
```

This holds the last caption at the end of the recording instead of briefly falling back to the first caption. It returns to the first when the video loops to time `0`.

In the `styles.sceneProgress` rendering, clamp the current segment’s progress. Replace its existing `transform` value with:

```tsx
transform: `scaleX(${
  index < currentScene
    ? 1
    : index === currentScene
      ? Math.min(1, Math.max(0, (time - item.start) / (item.end - item.start)))
      : 0
})`
```

Every scene must have `end > start`.

## 7. Add video styles

Add these rules to `mcp-server/app/demo/demo.module.css`:

```css
.recordedVideo {
  display: block;
  width: clamp(260px, 19.4vw, 390px);
  height: min(100%, 690px);
  max-width: 100%;
  min-height: 0;
  aspect-ratio: 9 / 16;
  object-fit: contain;
  border: 2px solid var(--color-navy-line);
  border-radius: 24px;
  background: var(--color-navy-2);
}

@media (max-width: 900px) {
  .recordedVideo {
    width: 250px;
    max-height: 560px;
  }
}

@media (max-width: 600px) {
  .recordedVideo {
    width: 255px;
    max-width: 90%;
    flex: 1;
    max-height: 520px;
  }
}
```

`object-fit: contain` shows the complete recording without cropping the shopping UI. The video occupies the same central position as the animated phone.

## 8. Update the label and remove unused animation code

Change the second slide’s footer text from:

```text
Animated walkthrough · sample data
```

to a description of the recording, for example:

```text
Recorded walkthrough
```

If the recording uses sample prices or includes a sale-alert prototype, retain that context in the label or the relevant scene caption.

Remove the now-unused `phoneCues` constant, `cue` calculation, and these phone-animation components:

- `Message`
- `Reveal`
- `Typing`
- `PhoneContent`
- `PhonePanel`

Remove `memo`, `useLayoutEffect`, and the `ReactNode` type import once they are unused. Keep `Milk`, which is also used on the first slide. The corresponding phone-only CSS can be removed after checking for remaining references.

## 9. Verify

Run from `mcp-server/`:

```bash
npm run check
npm run build
```

For local preview:

```bash
npm run dev
```

Open `/videos/denarwise-demo.mp4` directly to confirm the file loads, then visit **`/demo#watch`** and check:

- The recording starts on the second slide and stays paused on the others.
- Leaving and returning restarts the recording.
- Both the footer and native controls can pause and resume playback.
- Captions follow the recording, including after seeking and looping.
- The entire video fits on desktop and mobile.

Deploy the MP4 with the app along with the two edited source files. For later recording replacements, overwrite the same MP4 and redeploy; update the scene timings whenever the recording’s pacing changes.
