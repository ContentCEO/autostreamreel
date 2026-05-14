// Bridge to Tauri commands. Returns null functions when running in a plain
// browser (no __TAURI__ global). Lets the rest of the app stay clean.

export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDesktop()) throw new Error("desktop commands only available in the Tauri shell");
  const mod = await import("@tauri-apps/api/core");
  return mod.invoke<T>(cmd, args);
}

export interface Screenshot {
  png_base64: string;
  width: number;
  height: number;
}

export const desktop = {
  takeScreenshot:  () => invoke<Screenshot>("take_screenshot"),
  mouseMove:       (x: number, y: number) => invoke<void>("mouse_move", { args: { x, y } }),
  mouseClick:      (button: "left" | "right" | "middle" = "left", double = false) =>
                       invoke<void>("mouse_click", { args: { button, double } }),
  typeText:        (text: string) => invoke<void>("type_text", { args: { text } }),
  keyPress:        (key: string)  => invoke<void>("key_press",  { args: { key } }),
};
