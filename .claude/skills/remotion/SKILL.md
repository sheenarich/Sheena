---
name: remotion
description: >-
  Create videos programmatically with code using Remotion, the React framework
  for making real MP4/WebM/GIF videos. Use this skill whenever the user wants to
  create, edit, render, or animate a video with code — including intros, title
  cards, data-driven or generative videos, animated explainers, social clips,
  slideshows, product demos, or subtitles/captions — even if they don't say the
  word "Remotion." Trigger on phrases like "make a video with code," "generate an
  MP4," "animated intro," "render a video," "code a video," or "programmatic
  video." Covers scaffolding a project, the animation API (frames, interpolate,
  spring, sequences), adding audio/images/video, and rendering to a file.
---

# Remotion: Videos with Code

Remotion turns React components into real videos. You write a component, Remotion
renders it frame-by-frame (via headless Chromium) and stitches the frames into an
MP4, WebM, or GIF. Everything you know from React — components, props, state,
CSS, SVG, canvas, WebGL — works, and the video is fully data-driven: change a
prop, get a different video.

The mental model that matters most: **a video is a pure function of the current
frame.** You never imperatively "play" an animation. Instead each component asks
"what frame is it right now?" and renders what it should look like at that frame.
Remotion advances the frame and captures each one. Keep every visual a
deterministic function of `frame` (and props) — no `Date.now()`, no `Math.random()`
without a fixed seed, no unseeded animation — or frames won't reproduce and the
render will flicker.

## When to reach for what

- **Just getting started / no project yet** → Scaffold a project (below), then
  edit `src/` compositions.
- **Need the animation API** (`interpolate`, `spring`, `Sequence`, easing,
  timing) → read `references/api.md`.
- **Need a concrete recipe** (fade in, slide, typewriter text, animated bar
  chart, Ken Burns image pan, audio sync, captions) → read
  `references/patterns.md`.
- **Ready to produce the file** → see [Rendering](#rendering) below.

Read the reference files with the Read tool only when the task needs them; don't
preload everything.

## Scaffolding a project

If there's no Remotion project yet, create one. The scripted path is fastest and
non-interactive:

```bash
bash .claude/skills/remotion/scripts/scaffold.sh my-video
```

That creates `my-video/` with a minimal, known-good project (a `HelloWorld`
composition) and installs dependencies. Prefer it over the interactive
`npm create video@latest`, which prompts for a template and blocks in an
automated environment.

If you must set up manually, the essentials are:

- Dependencies: `remotion`, `@remotion/cli`, and matching `react` + `react-dom`.
  Keep every `remotion`/`@remotion/*` package on the **same version** or the CLI
  refuses to render.
- An entry file (`src/index.ts`) that calls `registerRoot(RemotionRoot)`.
- A `Root` component that returns one or more `<Composition>` elements, each
  giving an `id`, the `component`, `durationInFrames`, `fps`, `width`, `height`,
  and `defaultProps`.

## Anatomy of a composition

```tsx
import { Composition } from "remotion";
import { MyVideo } from "./MyVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MyVideo"              // referenced by the render/studio CLI
      component={MyVideo}
      durationInFrames={150}    // 150 frames ÷ 30fps = 5 seconds
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ title: "Hello" }}
    />
  );
};
```

Inside the component, read the timeline instead of animating imperatively:

```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const MyVideo: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();               // 0, 1, 2, … per rendered frame
  const { fps, durationInFrames } = useVideoConfig();

  // Fade the title in over the first 30 frames (1 second at 30fps).
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",                   // stay at 1 after frame 30
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b0f", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ color: "white", fontSize: 90, opacity }}>{title}</h1>
    </AbsoluteFill>
  );
};
```

`AbsoluteFill` is a `position: absolute` box filling the whole frame — the go-to
container for layering. Stack multiple `AbsoluteFill`s to composite layers.

## Time is frames, not seconds

All durations are in **frames**. Convert with `fps`: `seconds * fps`. Always pull
`fps` from `useVideoConfig()` rather than hardcoding 30 — it keeps components
reusable across compositions and correct if the fps changes. To place things on a
timeline, wrap them in `<Sequence from={90} durationInFrames={60}>`; inside a
Sequence, `useCurrentFrame()` is rebased to start at 0, so each clip animates
relative to its own start. This is the key to sequencing scenes without
frame-offset arithmetic everywhere.

## Rendering

Preview interactively in the browser-based studio (hot-reloads as you edit):

```bash
npx remotion studio
```

Render to a file (Remotion downloads a headless Chromium the first time):

```bash
# npx remotion render <entry> <composition-id> <output>
npx remotion render src/index.ts MyVideo out/video.mp4

# Pass data in; must match the composition's prop shape.
npx remotion render src/index.ts MyVideo out/video.mp4 --props='{"title":"Launch Day"}'

# Other formats / quality knobs
npx remotion render src/index.ts MyVideo out/clip.gif      # .gif infers the codec
npx remotion render src/index.ts MyVideo out/video.webm --codec=vp8
npx remotion render src/index.ts MyVideo out/video.mp4 --crf=18   # lower = higher quality
```

Render a single still image with `npx remotion still <entry> <id> out/frame.png --frame=42`.

In this environment Chromium is already available under `/opt/pw-browsers`; if
Remotion can't find a browser, point it at the **headless-shell** binary rather
than downloading one:

```bash
npx remotion render src/index.ts MyVideo out/video.mp4 \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
```

Use the `chromium_headless_shell-*` build, not the full `chromium-*/chrome`
binary: recent Chrome removed the "old headless" mode Remotion relies on, so the
full binary fails to launch with `Old Headless mode has been removed`. The
standalone `headless_shell` is that old-headless implementation and renders
cleanly. The `-1194` version suffix may differ — glob
`/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell`.

## Assets, audio, and video

Put static files in a `public/` folder and reference them with `staticFile("name.png")`.
Use Remotion's media components (never raw `<img>`/`<audio>`/`<video>`) so they
stay in sync with the render clock:

- `<Img src={staticFile("logo.png")} />`
- `<Audio src={staticFile("music.mp3")} />` — trim/volume via props; volume can
  be a function of frame for fades.
- `<Video>` / `<OffthreadVideo>` to embed other clips (`OffthreadVideo` is more
  reliable for rendering).

See `references/patterns.md` for audio-synced animation and image pans.

## Guardrails that save renders

- **Determinism:** no `Math.random()` (seed it) or `Date.now()`; derive
  everything from `frame` + props. Non-deterministic renders flicker or fail to
  reproduce.
- **Version lockstep:** every `remotion` and `@remotion/*` package must share the
  exact same version.
- **Clamp extrapolation:** by default `interpolate` extends the line past your
  input range, which sends opacity/scale to absurd values. Pass
  `extrapolateLeft: "clamp"` / `extrapolateRight: "clamp"` unless you want the
  continuation.
- **Prefer `spring` for organic motion** and `interpolate` for precise, linear
  timing — mixing the right tool per motion reads far better than easing
  everything the same way.
- **Fonts:** load web/custom fonts via `@remotion/google-fonts` or `@remotion/fonts`
  and `waitUntilDone()` so text is measured correctly before frames are captured.
