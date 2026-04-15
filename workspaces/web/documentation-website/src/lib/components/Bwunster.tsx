import { useState } from "react";
import { AnimatedSprite } from "../util/pixelArt";

export const Bwunster = () => {
  const [isIdle, setIsIdle] = useState(false);

  return (
    <div className="bwunster-container">
      <div className="bwunster-top">
        <AnimatedSprite
          spritesheetFileName="bwunster-intro_animation_compact_64x106"
          width={128}
          height={140}
          fps={10}
          onFinish={() => {
            setTimeout(() => setIsIdle(true), 250);
          }}
          reducedMotionFrame={10}
        />
        {isIdle && (
          <div className="bwunster-idle">
            <AnimatedSprite
              spritesheetFileName="bwunster-blink_animation_64x70"
              width={128}
              height={140}
              fps={10}
              loop
              frameLengths={{
                0: () => Math.round(Math.random() * 80),
                1: 2,
              }}
              reducedMotionFrame={0}
            />
          </div>
        )}
      </div>
      <div className="bwunster-bottom">
        <div className="dark-only">
          <AnimatedSprite
            spritesheetFileName="bw-title_animation--dark_99x10"
            width={256}
            height={25}
            fps={10}
            frameLengths={{
              16: 100,
            }}
            loop
            canvasProps={{
              "aria-labelledby": "home-title",
            }}
            reducedMotionFrame={16}
          />
        </div>
        <div className="light-only">
          <AnimatedSprite
            spritesheetFileName="bw-title_animation--light_99x10"
            width={256}
            height={25}
            fps={10}
            frameLengths={{
              16: 100,
            }}
            loop
            canvasProps={{
              "aria-labelledby": "home-title",
            }}
            reducedMotionFrame={16}
          />
        </div>
      </div>
    </div>
  );
};
