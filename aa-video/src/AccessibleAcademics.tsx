import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Brand gradient sampled from the Accessible Academics logo: teal → blue.
const TEAL = "#3fc9c4";
const BLUE = "#4a5bd0";
const GRAD = `linear-gradient(90deg, ${TEAL} 0%, #45a9d0 45%, ${BLUE} 100%)`;

export const AccessibleAcademics: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Spring pop for the primary word — bouncy entrance that settles.
  const pop = spring({ frame, fps, config: { damping: 11, stiffness: 120 } });
  const popScale = interpolate(pop, [0, 1], [0.4, 1]);

  // Second word pops a few frames later so the two cascade in.
  const pop2 = spring({ frame, fps, delay: 10, config: { damping: 13 } });
  const word2Y = interpolate(pop2, [0, 1], [40, 0]);

  // Accent bar wipes out from the centre, echoing the logo's divider rules.
  const barW = interpolate(spring({ frame, fps, delay: 6, config: { damping: 20 } }), [0, 1], [0, 620]);

  // Gentle fade-in at the very start and fade-out at the very end.
  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Georgia, 'Times New Roman', serif",
        opacity,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            transform: `scale(${popScale})`,
            fontSize: 148,
            fontWeight: 700,
            letterSpacing: 2,
            backgroundImage: GRAD,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Accessible
        </div>

        <div
          style={{
            marginTop: 18,
            height: 8,
            width: barW,
            borderRadius: 4,
            backgroundImage: GRAD,
          }}
        />

        <div
          style={{
            transform: `translateY(${word2Y}px)`,
            opacity: pop2,
            marginTop: 22,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: 14,
            textTransform: "uppercase",
            color: "#141414",
          }}
        >
          Academics
        </div>
      </div>
    </AbsoluteFill>
  );
};
