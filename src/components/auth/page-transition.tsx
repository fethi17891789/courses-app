"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function PageTransition({
  active,
  onComplete,
  color = "#7c3aed",
}: {
  active: boolean;
  onComplete: () => void;
  color?: string;
}) {
  const [phase, setPhase] = useState<"idle" | "check" | "wipe">("idle");

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }
    setPhase("check");
    const t1 = setTimeout(() => setPhase("wipe"), 550);
    const t2 = setTimeout(() => onComplete(), 1050);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, onComplete]);

  if (!active && phase === "idle") return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {phase === "check" && (
            <motion.div
              className="relative flex items-center justify-center"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: [0, 1.15, 1], rotate: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.23, 1, 0.32, 1] as const,
              }}
            >
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <motion.circle
                  cx="32"
                  cy="32"
                  r="29"
                  stroke={color}
                  strokeWidth="3"
                  fill={`${color}12`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.23, 1, 0.32, 1] as const,
                  }}
                />
                <motion.path
                  d="M20 33l8 8 16-18"
                  stroke={color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: 0.35,
                    delay: 0.2,
                    ease: [0.23, 1, 0.32, 1] as const,
                  }}
                />
              </svg>
            </motion.div>
          )}

          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: "#f0ecff" }}
            initial={{ clipPath: "circle(0% at 50% 50%)" }}
            animate={
              phase === "wipe"
                ? { clipPath: "circle(150% at 50% 50%)" }
                : { clipPath: "circle(0% at 50% 50%)" }
            }
            transition={{
              duration: 0.5,
              ease: [0.32, 0.72, 0, 1] as const,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
