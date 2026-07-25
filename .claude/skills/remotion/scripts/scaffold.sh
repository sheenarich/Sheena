#!/usr/bin/env bash
# Scaffold a minimal, known-good Remotion project non-interactively.
# Usage: bash scaffold.sh [project-dir]   (default: my-video)
#
# Creates the project files and installs dependencies. Prefer this over the
# interactive `npm create video@latest`, which prompts for a template and blocks
# in automated environments.
set -euo pipefail

DIR="${1:-my-video}"
# Pin to a recent Remotion; keep every remotion/@remotion package identical.
REMOTION_VERSION="${REMOTION_VERSION:-4.0.0}"

if [ -e "$DIR" ]; then
  echo "Refusing to overwrite existing path: $DIR" >&2
  exit 1
fi

echo "Scaffolding Remotion project in ./$DIR (remotion ^$REMOTION_VERSION)"
mkdir -p "$DIR/src" "$DIR/public"
cd "$DIR"

cat > package.json <<JSON
{
  "name": "${DIR//[^a-zA-Z0-9_-]/-}",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "studio": "remotion studio",
    "render": "remotion render src/index.ts HelloWorld out/video.mp4",
    "upgrade": "remotion upgrade"
  },
  "dependencies": {
    "@remotion/cli": "^${REMOTION_VERSION}",
    "remotion": "^${REMOTION_VERSION}",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "typescript": "^5.4.0"
  }
}
JSON

cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src"]
}
JSON

cat > remotion.config.ts <<'TS'
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
TS

cat > src/index.ts <<'TS'
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
TS

cat > src/Root.tsx <<'TSX'
import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HelloWorld"
      component={HelloWorld}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ title: "Hello, Remotion" }}
    />
  );
};
TSX

cat > src/HelloWorld.tsx <<'TSX'
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const HelloWorld: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 14 } });
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0b0b0f",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          color: "white",
          fontFamily: "sans-serif",
          fontSize: 96,
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        {title}
      </h1>
    </AbsoluteFill>
  );
};
TSX

echo "*.log" > .gitignore
{ echo "node_modules"; echo "out"; } >> .gitignore

echo "Installing dependencies (npm install)…"
npm install --no-audit --no-fund

cat <<EOF

Done. Next:
  cd $DIR
  npx remotion studio                                   # live preview in the browser
  npx remotion render src/index.ts HelloWorld out/video.mp4   # render an MP4
EOF
