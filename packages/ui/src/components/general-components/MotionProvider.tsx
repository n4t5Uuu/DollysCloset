"use client";

import { LazyMotion, domAnimation } from "motion/react";

/** Loads motion's animation features on demand. Wrap the app once so `m.*` elements animate. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
