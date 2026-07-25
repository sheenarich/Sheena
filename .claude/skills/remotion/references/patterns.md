# Remotion Recipes

Copy-paste-ready patterns for common effects. Each is a self-contained component
you can drop into a composition. Read this when the user asks for a specific
effect. Table of contents:

1. [Fade in / out](#fade-in--out)
2. [Slide + spring entrance](#slide--spring-entrance)
3. [Typewriter text](#typewriter-text)
4. [Staggered list reveal](#staggered-list-reveal)
5. [Animated bar chart (data-driven)](#animated-bar-chart-data-driven)
6. [Ken Burns image pan/zoom](#ken-burns-image-panzoom)
7. [Background music with fade](#background-music-with-fade)
8. [Scene sequencing with crossfade](#scene-sequencing-with-crossfade)
9. [Captions / subtitles](#captions--subtitles)

---

## Fade in / out

```tsx
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const FadeInOut: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 20, durationInFrames - 20, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return <AbsoluteFill style={{ opacity, justifyContent: "center", alignItems: "center" }}>
    <h1 style={{ fontSize: 80 }}>Fades in and out</h1>
  </AbsoluteFill>;
};
```

---

## Slide + spring entrance

```tsx
import { AbsoluteFill, spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const SlideIn: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14 } });
  const x = interpolate(s, [0, 1], [-300, 0]);
  return <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
    <div style={{ transform: `translateX(${x}px)`, opacity: s, fontSize: 72 }}>Slides in</div>
  </AbsoluteFill>;
};
```

---

## Typewriter text

Deterministic: characters shown are a function of frame, so it renders identically
every time.

```tsx
import { AbsoluteFill, useCurrentFrame } from "remotion";

export const Typewriter: React.FC<{ text: string; cps?: number }> = ({ text, cps = 20 }) => {
  const frame = useCurrentFrame();
  // cps = characters per second; assumes 30fps timeline (frame/fps * cps).
  const shown = Math.floor((frame / 30) * cps);
  return <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
    <code style={{ fontSize: 56 }}>{text.slice(0, shown)}<span style={{ opacity: frame % 30 < 15 ? 1 : 0 }}>▌</span></code>
  </AbsoluteFill>;
};
```

---

## Staggered list reveal

Each item springs in a few frames after the previous — the classic "items cascade
in" look.

```tsx
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const StaggerList: React.FC<{ items: string[] }> = ({ items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <AbsoluteFill style={{ justifyContent: "center", padding: 120, gap: 24 }}>
    {items.map((item, i) => {
      const s = spring({ frame, fps, delay: i * 6, config: { damping: 16 } });
      return <div key={item} style={{ opacity: s, transform: `translateY(${(1 - s) * 40}px)`, fontSize: 48 }}>{item}</div>;
    })}
  </AbsoluteFill>;
};
```

---

## Animated bar chart (data-driven)

Bars grow with a spring; pass real data as a prop and the video reflects it.

```tsx
import { AbsoluteFill, spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const BarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...data.map((d) => d.value));
  return <AbsoluteFill style={{ flexDirection: "row", alignItems: "flex-end", gap: 40, padding: 80 }}>
    {data.map((d, i) => {
      const grow = spring({ frame, fps, delay: i * 4, config: { damping: 18 } });
      const h = interpolate(grow, [0, 1], [0, (d.value / max) * 700]);
      return <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 120, height: h, background: "#3b82f6", borderRadius: 8 }} />
        <span style={{ fontSize: 28 }}>{d.label}</span>
      </div>;
    })}
  </AbsoluteFill>;
};
```

---

## Ken Burns image pan/zoom

```tsx
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const KenBurns: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.25]);
  const x = interpolate(frame, [0, durationInFrames], [0, -60]);
  return <AbsoluteFill style={{ overflow: "hidden" }}>
    <Img src={staticFile(src)} style={{ transform: `scale(${scale}) translateX(${x}px)`, width: "100%", height: "100%", objectFit: "cover" }} />
  </AbsoluteFill>;
};
```

---

## Background music with fade

Volume can be a function of frame for fade-in/out. Trim with `startFrom`/`endAt`.

```tsx
import { Audio, interpolate, staticFile, useVideoConfig } from "remotion";

export const Music: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return <Audio
    src={staticFile("music.mp3")}
    volume={(f) => interpolate(f, [0, 30, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
  />;
};
```

---

## Scene sequencing with crossfade

Overlap two scenes with `Series` + negative `offset`, fading between them.

```tsx
import { Series } from "remotion";
import { SlideIn } from "./SlideIn";
import { FadeInOut } from "./FadeInOut";

export const Story: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={90}><SlideIn /></Series.Sequence>
    <Series.Sequence durationInFrames={90} offset={-20}><FadeInOut /></Series.Sequence>
  </Series>
);
```

---

## Captions / subtitles

Drive captions from a data array of `{ from, to, text }` in frames. For real
speech-timed captions, generate the timings with `@remotion/captions` +
`@remotion/install-whisper-cpp`, then render them the same way.

```tsx
import { AbsoluteFill, Sequence } from "remotion";

const CAPTIONS = [
  { from: 0,  durationInFrames: 60, text: "First line" },
  { from: 60, durationInFrames: 60, text: "Second line" },
];

export const Captions: React.FC = () => (
  <AbsoluteFill>
    {CAPTIONS.map((c) => (
      <Sequence key={c.from} from={c.from} durationInFrames={c.durationInFrames}>
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 90 }}>
          <span style={{ fontSize: 48, color: "white", background: "rgba(0,0,0,0.6)", padding: "8px 24px", borderRadius: 8 }}>{c.text}</span>
        </AbsoluteFill>
      </Sequence>
    ))}
  </AbsoluteFill>
);
```
