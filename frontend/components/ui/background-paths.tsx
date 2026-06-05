"use client";

import { motion } from "framer-motion";

function FloatingPath({ d, delay = 0 }: { d: string; delay?: number }) {
  return (
    <motion.path
      d={d}
      stroke="currentColor"
      strokeWidth="1"
      strokeOpacity="0.12"
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 3, delay, ease: "easeInOut" }}
    />
  );
}

export function BackgroundPaths({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none text-slate-400" aria-hidden>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <FloatingPath d="M 0 300 Q 300 100 600 300 T 1200 300" delay={0} />
          <FloatingPath d="M 0 400 Q 200 200 500 380 T 1200 200" delay={0.4} />
          <FloatingPath d="M 100 0 Q 400 250 800 50 T 1200 350" delay={0.8} />
          <FloatingPath d="M 0 150 Q 350 350 700 150 T 1200 450" delay={1.2} />
          <FloatingPath d="M 200 500 Q 500 300 900 480 T 1200 100" delay={0.6} />
          <FloatingPath d="M 0 500 Q 250 150 650 480 T 1100 100" delay={1.0} />
          <FloatingPath d="M 50 600 Q 400 400 750 550 T 1200 250" delay={1.5} />
          <FloatingPath d="M 0 50 Q 300 300 600 80 T 1200 520" delay={0.2} />
        </svg>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
