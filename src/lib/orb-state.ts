// Single source of truth for the global Jarvis orb state. Anyone can publish
// (the speech layer when it starts/stops playing, ContinuousJarvis when the
// mic flips on, the chat panel when a request is in flight). The JarvisOrb
// in the panel subscribes and animates accordingly.

import type { OrbState } from "@/components/JarvisOrb";

let current: OrbState = "idle";
const listeners = new Set<(s: OrbState) => void>();

export function setOrbState(s: OrbState) {
  if (s === current) return;
  current = s;
  for (const l of listeners) l(s);
}

export function getOrbState(): OrbState { return current; }

export function subscribeOrbState(fn: (s: OrbState) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => { listeners.delete(fn); };
}
