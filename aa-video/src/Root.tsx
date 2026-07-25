import { Composition } from "remotion";
import { AccessibleAcademics } from "./AccessibleAcademics";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AccessibleAcademics"
      component={AccessibleAcademics}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
