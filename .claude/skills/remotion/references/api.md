# Remotion Animation API

Detailed reference for the timing/animation primitives. Read this when you need
exact signatures and behavior. Table of contents:

1. [Reading the clock](#reading-the-clock)
2. [interpolate](#interpolate)
3. [spring](#spring)
4. [Easing](#easing)
5. [Sequence, Series, and timing](#sequence-series-and-timing)
6. [Layout components](#layout-components)
7. [interpolateColors & useful helpers](#interpolatecolors--useful-helpers)

---

## Reading the clock

```tsx
const frame = useCurrentFrame();      // current frame index (rebased inside a Sequence)
const { fps, durationInFrames, width, height } = useVideoConfig();
```

`useCurrentFrame` is the heartbeat of every animation. Inside a `<Sequence from={N}>`
it returns `0` at the sequence's start, so components animate relative to their own
placement — you rarely subtract offsets by hand.

---

## interpolate

Maps a value from an input range to an output range. This is the workhorse for
linear/eased motion (opacity, position, scale, rotation).

```tsx
interpolate(
  input: number,
  inputRange: number[],   // must be strictly increasing, e.g. [0, 30, 60]
  outputRange: number[],  // same length as inputRange
  options?: {
    easing?: (t: number) => number,          // default: linear
    extrapolateLeft?: "extend" | "clamp" | "identity" | "wrap",
    extrapolateRight?: "extend" | "clamp" | "identity" | "wrap",  // default: "extend"
  }
): number
```

- **Always clamp** unless you want the line to keep going past the range. Default
  `extend` will happily produce opacity `2` or negative scale.
- Multi-point ranges chain segments: `interpolate(frame, [0, 30, 60], [0, 1, 0])`
  fades in then out.

```tsx
// Slide up 100px while fading in over the first second, then hold.
const y = interpolate(frame, [0, 30], [100, 0], { extrapolateRight: "clamp" });
const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
style={{ transform: `translateY(${y}px)`, opacity }}
```

---

## spring

Physics-based motion that eases naturally (overshoot, settle). Use it for entrances,
pops, and anything that should feel organic.

```tsx
const value = spring({
  frame,                 // usually useCurrentFrame()
  fps,                   // from useVideoConfig()
  config?: {
    damping?: number,    // default 10; higher = less bouncy
    stiffness?: number,  // default 100
    mass?: number,       // default 1
  },
  from?: number,         // default 0
  to?: number,           // default 1
  durationInFrames?: number,  // optional: stretch the spring to a fixed length
  delay?: number,
});
```

`spring` returns ~0→1 by default; multiply it into whatever you're animating.

```tsx
const scale = spring({ frame, fps, config: { damping: 12 } });
style={{ transform: `scale(${scale})` }}

// Bouncier pop:
const pop = spring({ frame, fps, config: { damping: 8, stiffness: 120 } });
```

Combine with `interpolate` to remap a spring's 0→1 into any range:
`interpolate(spring({frame, fps}), [0, 1], [-200, 0])`.

---

## Easing

Pass an easing function to `interpolate` for non-linear timing. Import `Easing`
from `remotion`.

```tsx
import { Easing, interpolate } from "remotion";

interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.out(Easing.cubic),
  extrapolateRight: "clamp",
});
```

Common choices: `Easing.linear`, `Easing.ease`, `Easing.in/out/inOut(fn)`,
`Easing.cubic`, `Easing.bezier(0.25, 0.1, 0.25, 1)`, `Easing.elastic(1)`.
`Easing.out(...)` decelerates into the end and usually looks best for entrances.

---

## Sequence, Series, and timing

`<Sequence>` places a subtree on the timeline and rebases its frame to 0.

```tsx
import { Sequence } from "remotion";

<Sequence from={0}  durationInFrames={60}><Intro /></Sequence>
<Sequence from={60} durationInFrames={90}><Body /></Sequence>
```

- `from` — frame (in the parent's clock) where this sequence starts.
- `durationInFrames` — how long it stays mounted; omit to run to the end.
- `layout="none"` — don't wrap children in an `AbsoluteFill` (use when you just
  want the time-shift, not a positioned box).

`<Series>` chains sequences back-to-back without computing `from` yourself:

```tsx
import { Series } from "remotion";

<Series>
  <Series.Sequence durationInFrames={60}><Intro /></Series.Sequence>
  <Series.Sequence durationInFrames={90}><Body /></Series.Sequence>
  <Series.Sequence durationInFrames={45} offset={-15}><Outro /></Series.Sequence>
</Series>
```

`offset` on a `Series.Sequence` overlaps it with the previous one (negative =
start early, for crossfades).

Other timing helpers:
- `useCurrentFrame()` + arithmetic for manual gating.
- `<Freeze frame={30}>` renders children as if permanently on frame 30.
- `delayRender()` / `continueRender()` — pause capture until async work (data
  fetch, image/font load) completes, so a frame isn't captured half-loaded.

---

## Layout components

- `<AbsoluteFill>` — `position:absolute; inset:0`, fills the frame. Layer them to
  composite. Accepts normal `style`.
- `<Sequence layout="none">` — time-shift without positioning.
- Plain divs with fl/grid CSS work exactly as in any React app; the frame is just
  a 1920×1080 (or whatever you set) viewport.

---

## interpolateColors & useful helpers

```tsx
import { interpolateColors } from "remotion";
const bg = interpolateColors(frame, [0, 60], ["#000000", "#3b82f6"]);
```

Interpolates in RGB space between colors — great for background transitions.

Other frequently-used exports from `remotion`:
- `staticFile(path)` — resolve a file in `public/`.
- `random(seed)` — deterministic pseudo-random in `[0,1)`; **use this instead of
  `Math.random()`** so renders reproduce.
- `<Img>`, `<Audio>`, `<Video>`, `<OffthreadVideo>`, `<IFrame>` — render-clock-aware
  media.
- `measureSpring(...)` — how many frames a spring needs to settle, for sizing
  sequences.
