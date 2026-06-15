import { useEffect } from "react";

export function usePreventBrowserZoom() {
  useEffect(() => {
    const preventWheelZoom = (event) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    const preventKeyboardZoom = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      if (
        event.key === "+" ||
        event.key === "-" ||
        event.key === "=" ||
        event.key === "0" ||
        event.key === "_"
      ) {
        event.preventDefault();
      }
    };

    const preventGestureZoom = (event) => {
      event.preventDefault();
    };

    window.addEventListener("wheel", preventWheelZoom, {
      capture: true,
      passive: false,
    });
    window.addEventListener("keydown", preventKeyboardZoom, { capture: true });
    document.addEventListener("gesturestart", preventGestureZoom, {
      passive: false,
    });
    document.addEventListener("gesturechange", preventGestureZoom, {
      passive: false,
    });
    document.addEventListener("gestureend", preventGestureZoom, {
      passive: false,
    });

    return () => {
      window.removeEventListener("wheel", preventWheelZoom, { capture: true });
      window.removeEventListener("keydown", preventKeyboardZoom, {
        capture: true,
      });
      document.removeEventListener("gesturestart", preventGestureZoom);
      document.removeEventListener("gesturechange", preventGestureZoom);
      document.removeEventListener("gestureend", preventGestureZoom);
    };
  }, []);
}
