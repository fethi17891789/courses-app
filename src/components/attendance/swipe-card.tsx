"use client";

import { useState } from "react";
import { StudentAvatar } from "@/components/students/student-avatar";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { getLevelDef } from "@/lib/levels";

type Student = {
  id: string;
  full_name: string;
  phone: string | null;
  level: string;
  payment_due: boolean;
  payment_amount: number;
};

const SWIPE_THRESHOLD = 100;
const SWIPE_UP_THRESHOLD = -80;

export function SwipeCard({
  student,
  isTop,
  depth,
  onSwipe,
  price,
}: {
  student: Student;
  isTop: boolean;
  depth: number;
  onSwipe: (direction: "left" | "right" | "up") => void;
  price: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [swiping, setSwiping] = useState(false);

  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [0.5, 0.8, 1, 0.8, 0.5]
  );

  // Overlay opacities
  const rightOpacity = useTransform(x, [0, 80], [0, 1]);
  const leftOpacity = useTransform(x, [-80, 0], [1, 0]);
  const upOpacity = useTransform(y, [-80, 0], [1, 0]);

  const levelDef = getLevelDef(student.level);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const xOffset = info.offset.x;
    const yOffset = info.offset.y;

    if (student.payment_due && yOffset < SWIPE_UP_THRESHOLD && Math.abs(xOffset) < SWIPE_THRESHOLD) {
      setSwiping(true);
      onSwipe("up");
    } else if (xOffset > SWIPE_THRESHOLD) {
      setSwiping(true);
      onSwipe("right");
    } else if (xOffset < -SWIPE_THRESHOLD) {
      setSwiping(true);
      onSwipe("left");
    }
  }

  if (swiping) return null;

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        zIndex: 10 - depth,
        scale: 1 - depth * 0.05,
        y: depth * 8,
        pointerEvents: isTop ? "auto" : "none",
      }}
    >
      <motion.div
        drag={isTop}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.9}
        onDragEnd={isTop ? handleDragEnd : undefined}
        style={{
          x: isTop ? x : 0,
          y: isTop ? y : 0,
          rotate: isTop ? rotate : 0,
          opacity: isTop ? opacity : 1,
        }}
        className="relative h-full w-full cursor-grab rounded-3xl bg-white p-6 active:cursor-grabbing"
        whileTap={isTop ? { scale: 1.02 } : undefined}
      >
        {/* Shadow */}
        <div
          className="absolute inset-0 rounded-3xl"
          style={{ boxShadow: "0 6px 0 #e9e5f5, 0 16px 48px -12px rgba(30,27,75,0.15)" }}
        />

        {/* Green overlay (right = present + paid OR just present) */}
        {isTop && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center rounded-3xl"
            style={{
              opacity: rightOpacity,
              background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(22,163,74,0.08))",
              border: "3px solid #22c55e",
            }}
          >
            <div className="rounded-xl bg-green-500 px-4 py-2 text-[14px] font-extrabold text-white shadow-[0_3px_0_#15803d]">
              {student.payment_due ? `P + ${student.payment_amount} DA` : "P"}
            </div>
          </motion.div>
        )}

        {/* Red overlay (left = absent) */}
        {isTop && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center rounded-3xl"
            style={{
              opacity: leftOpacity,
              background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))",
              border: "3px solid #ef4444",
            }}
          >
            <div className="rounded-xl bg-red-500 px-4 py-2 text-[14px] font-extrabold text-white shadow-[0_3px_0_#b91c1c]">
              Absent
            </div>
          </motion.div>
        )}

        {/* Amber overlay (up = present unpaid) - only if payment is due */}
        {isTop && student.payment_due && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center rounded-3xl"
            style={{
              opacity: upOpacity,
              background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.08))",
              border: "3px solid #f59e0b",
            }}
          >
            <div className="rounded-xl bg-amber-500 px-4 py-2 text-[14px] font-extrabold text-white shadow-[0_3px_0_#b45309]">
              P
            </div>
          </motion.div>
        )}

        {/* Card content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center">
          {/* L'ombre portee et l'arrondi sont sur l'enveloppe : l'avatar SVG
              porte deja son propre arrondi, on l'accorde ici pour garder le
              relief des cartes de l'application. */}
          <div
            className="mb-4 overflow-hidden"
            style={{
              borderRadius: "26%",
              boxShadow: "0 4px 0 #5b21b6, 0 8px 20px -6px rgba(124,58,237,0.4)",
            }}
          >
            <StudentAvatar seed={student.id} size={80} />
          </div>
          <h2 className="text-center text-[18px] font-extrabold text-[#1e1b4b]">
            {student.full_name}
          </h2>
          <p className="mt-1 text-[12px] font-semibold text-[#1e1b4b]/40">
            {levelDef?.label || student.level}
          </p>
          {student.phone && (
            <p className="mt-0.5 text-[11px] font-semibold text-[#1e1b4b]/30">
              {student.phone}
            </p>
          )}

          {/* Price badge */}
          <div className={`mt-4 rounded-xl px-4 py-2 ${student.payment_due ? "bg-[#f0ecff]" : "bg-green-50"}`}>
            <span className={`text-[13px] font-extrabold ${student.payment_due ? "text-[#7c3aed]" : "text-[#22c55e]"}`}>
              {student.payment_due ? `${student.payment_amount} DA` : "Paye"}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
