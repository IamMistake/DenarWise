# Demo video: local preview and Vercel deployment

The third slide at **`/demo#video`** plays a real MP4 under “Our last-minute MCP demo.” The second slide at `/demo#watch` keeps the scripted phone animation.

## Current recording

- Source: `final.mp4` in the repository root (kept locally; ignored by Git).
- Browser asset: `mcp-server/public/videos/denarwise-demo.mp4`.
- Poster: `mcp-server/public/videos/denarwise-demo-poster.webp`.
- Clip: approximately 76 seconds, landscape, 568 × 320.
- Optimized MP4: 3,942,226 bytes (3.94 MB), approximately **55% smaller** than the 8,669,314-byte source.
- Format: H.264 video with AAC audio. MP4 fast-start metadata allows playback before the entire file downloads.

This is the final supplied recording, replacing the earlier 2.3-second preview clip.

## Preview locally

From `mcp-server/`:

```bash
npm run dev
```

Open **`http://localhost:3000/demo#video`**, or the port printed by Next.js.

The video:

- Starts muted when entering slide three and loops.
- Pauses when leaving the slide, and restarts when returning.
- Provides native playback, seeking, volume, and fullscreen controls.
- Can also be paused or resumed with the presentation footer button.
- Shows its poster and waits for Play when the browser prefers reduced motion.

If autoplay is blocked, press Play. Enable audio through the video’s volume control.

## Replace the recording later

Put the replacement source outside `public/`, then run these commands from the repository root. FFmpeg must be installed.

```bash
ffmpeg -i YOUR_RECORDING.mov \
  -map 0:v:0 -map '0:a:0?' \
  -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 80k \
  -movflags +faststart -map_metadata -1 \
  -y mcp-server/public/videos/denarwise-demo.mp4

ffmpeg -ss 1 -i mcp-server/public/videos/denarwise-demo.mp4 \
  -frames:v 1 -quality 80 \
  -y mcp-server/public/videos/denarwise-demo-poster.webp
```

These settings preserve the source dimensions. For a high-resolution recording, consider adding `-vf 'scale=1280:-2'` to the first command for a landscape video; choose dimensions appropriate to the source so small recordings are not upscaled.

### Presentation files

| File | Purpose |
| --- | --- |
| `mcp-server/app/demo/demo-experience.tsx` | Video source, poster, playback lifecycle, slide heading, and footer control. |
| `mcp-server/app/demo/animated-demo.tsx` | Original animated phone walkthrough on slide two. |
| `mcp-server/app/demo/demo.module.css` | `.recordedVideo`, `.videoStage`, and responsive layout rules. |

The current layout is landscape. For a portrait shopping recording, update the `<video>` width/height attributes and `.recordedVideo` aspect ratio and width to match. Update the heading and the `Recorded MCP product demo` label as needed. Playback is tied to `active === 2` (the third slide, using zero-based indexing).

If the new file is shorter than one second, choose an earlier poster timestamp. Keep the original recording out of the deployment; only the optimized MP4 and poster belong in `public/videos/`.

## How the video reaches Vercel

Next.js serves `public/` files as static assets. The browser URL omits `public`:

```text
File: mcp-server/public/videos/denarwise-demo.mp4
URL:  /videos/denarwise-demo.mp4
```

After local review, commit the optimized MP4, poster, and source changes and push to the branch connected to Vercel. Vercel fetches those files from Git, builds the app, and includes the video in the deployment’s static assets. No separate manual video upload or runtime server storage is required.

Production URL after deployment:

```text
https://denarwise.betta.chat/videos/denarwise-demo.mp4
```

The original source recording does not need to be committed. For this small optimized clip, storing the MP4 directly in Git is sufficient. If future recordings become large, move them to object storage such as Vercel Blob and use the hosted URL as the video source.

## Verification

From `mcp-server/`:

```bash
npm run check
npm run build
```

Check desktop and mobile playback, pause/resume, leaving and returning to slide three, looping, and reduced-motion behavior. Check that the animated walkthrough still runs on slide two. Verify `/videos/denarwise-demo.mp4` loads directly.
