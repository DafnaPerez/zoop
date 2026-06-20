import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SplinePlanktonViewer, { clearHandoffFramingLock } from "./SplinePlanktonViewer";
import { scanSpecimen } from "../data/scanSpecimen";

const DETAIL_SPLINE_ZOOM = 0.7;
const SCAN_SPLINE_ZOOM =
  DETAIL_SPLINE_ZOOM * (scanSpecimen.scanZoomScale ?? scanSpecimen.detailZoomScale ?? 1);
const INTRO_MS = 7000;
const INTRO_PEAK_AT = 0.76;
const INTRO_SLIDE_MS = INTRO_MS * (1 - INTRO_PEAK_AT);
const INTRO_SLOT_Y_OFFSET = 110;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function applyShellRect(shell, rect) {
  shell.style.top = `${rect.top}px`;
  shell.style.left = `${rect.left}px`;
  shell.style.width = `${rect.width}px`;
  shell.style.height = `${rect.height}px`;
}

function applyShellCenter(shell, centerX, centerY, width, height) {
  applyShellRect(shell, {
    top: centerY - height / 2,
    left: centerX - width / 2,
    width,
    height,
  });
}

function getViewportCenterRect(width, height) {
  return {
    top: window.innerHeight / 2 - height / 2,
    left: window.innerWidth / 2 - width / 2,
    width,
    height,
  };
}

export default function HandoffSpecimenLayer({
  scanStageRef,
  handoffShellRef,
  scanOpen = false,
  detailOpen = false,
  collectionHandoff = false,
}) {
  const shellRef = useRef(null);
  const motionRef = useRef(null);
  const assignShellRef = useCallback(
    (node) => {
      shellRef.current = node;
      if (handoffShellRef) {
        handoffShellRef.current = node;
      }
    },
    [handoffShellRef],
  );

  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const node = motionRef.current;
    if (!node || !scanOpen) return;

    const handleEnd = (event) => {
      if (event.target !== node || event.animationName !== "scan-specimen-scale") return;
      setIntroComplete(true);
    };

    node.addEventListener("animationend", handleEnd);
    return () => node.removeEventListener("animationend", handleEnd);
  }, [scanOpen]);

  useEffect(() => {
    if (!scanOpen) {
      setIntroComplete(false);
      return undefined;
    }

    const fallback = window.setTimeout(() => setIntroComplete(true), INTRO_MS + 100);
    return () => window.clearTimeout(fallback);
  }, [scanOpen]);

  useEffect(() => {
    if (!scanOpen || !shellRef.current) return;
    clearHandoffFramingLock(shellRef.current);
  }, [scanOpen]);

  useLayoutEffect(() => {
    if (!scanOpen || !scanStageRef?.current || !shellRef.current) return;

    const slot = scanStageRef.current.getBoundingClientRect();
    if (!slot.width) return;

    applyShellRect(shellRef.current, getViewportCenterRect(slot.width, slot.height));
  }, [scanOpen, scanStageRef]);

  useEffect(() => {
    if (!scanOpen || introComplete || !shellRef.current || !scanStageRef?.current) {
      return undefined;
    }

    const shell = shellRef.current;
    const slot = scanStageRef.current;
    let frame = 0;
    let startTime = 0;
    let waitFrames = 0;

    const tick = (now) => {
      const slotRect = slot.getBoundingClientRect();
      if (!slotRect.width) {
        if (waitFrames < 90) {
          waitFrames += 1;
          frame = requestAnimationFrame(tick);
        }
        return;
      }

      if (!startTime) startTime = now;

      const t = Math.min(1, (now - startTime) / INTRO_SLIDE_MS);
      const eased = easeInOutCubic(t);
      const targetCenterX = slotRect.left + slotRect.width / 2;
      const targetCenterY = slotRect.top + slotRect.height / 2 + INTRO_SLOT_Y_OFFSET;

      applyShellCenter(
        shell,
        lerp(window.innerWidth / 2, targetCenterX, eased),
        lerp(window.innerHeight / 2, targetCenterY, eased),
        slotRect.width,
        slotRect.height,
      );

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, INTRO_MS * INTRO_PEAK_AT);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [scanOpen, introComplete, scanStageRef]);

  useLayoutEffect(() => {
    if (!scanOpen || !introComplete || !scanStageRef?.current || !shellRef.current) {
      return;
    }

    const syncToSlot = () => {
      const slot = scanStageRef.current?.getBoundingClientRect();
      const shell = shellRef.current;
      if (!slot?.width || !shell) return;
      applyShellRect(shell, {
        top: slot.top + INTRO_SLOT_Y_OFFSET,
        left: slot.left,
        width: slot.width,
        height: slot.height,
      });
    };

    syncToSlot();
    window.addEventListener("resize", syncToSlot);

    const resizeObserver = new ResizeObserver(syncToSlot);
    resizeObserver.observe(scanStageRef.current);

    return () => {
      window.removeEventListener("resize", syncToSlot);
      resizeObserver.disconnect();
    };
  }, [scanOpen, introComplete, scanStageRef]);

  if (!scanOpen || collectionHandoff) return null;

  const detailSuppressed = detailOpen;

  const shellClass = [
    "scan-specimen-flyer-shell",
    introComplete ? "scan-specimen-flyer-shell--interactive" : "",
    detailSuppressed ? "scan-specimen-flyer-shell--detail-suppressed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const motionClass = [
    "scan-specimen-motion",
    !introComplete ? "scan-specimen-entrance" : "",
    introComplete ? "scan-specimen-entrance--settled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const specimenNode = (
    <div ref={assignShellRef} className={shellClass}>
      <div ref={motionRef} className={motionClass}>
        <SplinePlanktonViewer
          key="scan-specimen"
          url={scanSpecimen.splineUrl}
          viewerSrc={scanSpecimen.splineViewer}
          className="detail-spline-viewer"
          zoomScale={SCAN_SPLINE_ZOOM}
          fillFactor={0.68}
          limitZoom
          introTurntableMs={!introComplete ? INTRO_MS : null}
          introTurntableRotations={2}
          resizeFrozen={!introComplete}
        />
      </div>
    </div>
  );

  return createPortal(specimenNode, document.body);
}
