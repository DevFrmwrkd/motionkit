export const DEMO_MODE_STORAGE_KEY = "motionkit_demo";
export const DEMO_MODE_EVENT = "motionkit-demo-mode-change";

export function readDemoMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true";
}

export function subscribeDemoMode(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener(DEMO_MODE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(DEMO_MODE_EVENT, handleChange);
  };
}

export function writeDemoMode(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (enabled) {
    window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, "true");
  } else {
    window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
  }

  window.dispatchEvent(new Event(DEMO_MODE_EVENT));
}
