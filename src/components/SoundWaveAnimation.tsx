import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

interface SoundWaveAnimationProps {
  analyserNode: AnalyserNode | null;
  isActive: boolean;
}

const BAR_COUNT = 7;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 48;

export function SoundWaveAnimation({
  analyserNode,
  isActive,
}: SoundWaveAnimationProps) {
  const [levels, setLevels] = useState<number[]>(
    new Array(BAR_COUNT).fill(MIN_HEIGHT)
  );
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive || !analyserNode) {
      setLevels(new Array(BAR_COUNT).fill(MIN_HEIGHT));
      return;
    }

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    const tick = () => {
      analyserNode.getByteFrequencyData(dataArray);

      // Sample evenly-spaced frequency bins
      const binSize = Math.floor(dataArray.length / BAR_COUNT);
      const newLevels: number[] = [];

      for (let i = 0; i < BAR_COUNT; i++) {
        const start = i * binSize;
        let sum = 0;
        for (let j = start; j < start + binSize; j++) {
          sum += dataArray[j];
        }
        const avg = sum / binSize;
        // Map 0-255 to MIN_HEIGHT-MAX_HEIGHT
        const height =
          MIN_HEIGHT + (avg / 255) * (MAX_HEIGHT - MIN_HEIGHT);
        newLevels.push(height);
      }

      setLevels(newLevels);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [isActive, analyserNode]);

  // Color gradient for bars — center bar is brightest
  const getBarColor = (index: number): string => {
    const center = (BAR_COUNT - 1) / 2;
    const distance = Math.abs(index - center) / center;
    if (!isActive) return "rgba(148, 163, 184, 0.4)"; // slate-400 muted
    // Gradient from blue-400 (center) to indigo-400 (edges)
    return distance < 0.3
      ? "rgb(96, 165, 250)" // blue-400
      : distance < 0.6
        ? "rgb(129, 140, 248)" // indigo-400
        : "rgb(167, 139, 250)"; // violet-400
  };

  return (
    <div
      className="flex items-center justify-center gap-[5px]"
      style={{ height: MAX_HEIGHT }}
      role="img"
      aria-label={isActive ? "Sound wave visualization — listening" : "Microphone inactive"}
    >
      {levels.map((height, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: 5,
            backgroundColor: getBarColor(i),
          }}
          animate={{
            height: isActive ? height : MIN_HEIGHT,
          }}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 12,
            mass: 0.5,
          }}
        />
      ))}
    </div>
  );
}
