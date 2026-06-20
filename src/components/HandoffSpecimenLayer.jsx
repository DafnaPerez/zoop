import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SplinePlanktonViewer, {
  applySplineFramingToHost,
  clearHandoffFramingLock,
  stabilizeSplineForHandoff,
} from "./SplinePlanktonViewer";
import { scanSpecimen } from "../data/scanSpecimen";

const DETAIL_SPLINE_ZOOM = 0.7;
const SCAN_SPLINE_ZOOM =
  DETAIL_SPLINE_ZOOM * (scanSpecimen.scanZoomScale ?? scanSpecimen.detailZoomScale ?? 1);
const GALLERY_SPLINE_ZOOM =
  DETAIL_SPLINE_ZOOM * (scanSpecimen.galleryZoomScale ?? scanSpecimen.detailZoomScale ?? 1);
const INTRO_MS = 7000;
const INTRO_PEAK_AT = 0.76;
const INTRO_SLIDE_MS = INTRO_MS * (1 - INTRO_PEAK_AT);
const INTRO_SLOT_Y_OFFSET = 110;
const GALLERY_FILL_FACTOR = scanSpecimen.galleryFillFactor ?? 0.84;

function commitGalleryFraming(shell) {
  applySplineFramingToHost(shell, GALLERY_SPLINE_ZOOM, true, GALLERY_FILL_FACTOR, 14, {
    lockFraming: true,
  });
}

const HANDOFF_MS = 2000;
const HANDOFF_SETTLE_MS = 250;

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

function normalizeRect(rect) {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function rectsNear(a, b, tolerance = 2) {
  return (
    Math.abs(a.top - b.top) <= tolerance &&
    Math.abs(a.left - b.left) <= tolerance &&
    Math.abs(a.width - b.width) <= tolerance &&
    Math.abs(a.height - b.height) <= tolerance
  );
}

function getVisualRect(element) {
  return normalizeRect(element.getBoundingClientRect());
}

function getRectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getUniformFitScale(sourceRect, targetRect) {
  return Math.min(targetRect.width / sourceRect.width, targetRect.height / sourceRect.height);
}

function applyUniformHandoffFrame(shell, sourceRect, dx, dy, scale) {
  applyShellRect(shell, sourceRect);
  shell.style.transformOrigin = "center center";
  shell.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
}

export default function HandoffSpecimenLayer({
  scanStageRef,
  handoffShellRef,
  galleryDockRef,
  handoffActive = false,
  handoffLanding = false,
  handoffStartRect = null,
  specimenDocked = false,
  scanOpen = false,
  detailOpen = false,
  onHandoffComplete,
  onDockReady,
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
  const handoffFinishedRef = useRef(false);
  const dockReadySentRef = useRef(false);

  const [introComplete, setIntroComplete] = useState(false);

  const handoffInFlight = handoffActive || handoffLanding;
  const useGalleryFraming = specimenDocked || handoffLanding;
  const splineLocked = handoffInFlight || specimenDocked;

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
    if (!scanOpen || !scanStageRef?.current || !shellRef.current || splineLocked) return;

    const slot = scanStageRef.current.getBoundingClientRect();
    if (!slot.width) return;

    applyShellRect(shellRef.current, getViewportCenterRect(slot.width, slot.height));
  }, [scanOpen, scanStageRef, splineLocked]);

  useEffect(() => {
    if (!scanOpen || introComplete || handoffInFlight || !shellRef.current || !scanStageRef?.current) {
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
  }, [scanOpen, handoffInFlight, introComplete, scanStageRef]);

  useLayoutEffect(() => {
    if (!scanOpen || handoffInFlight || !introComplete || !scanStageRef?.current || !shellRef.current) {
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
  }, [scanOpen, handoffInFlight, introComplete, scanStageRef]);

  const completeHandoff = useCallback(() => {
    if (handoffFinishedRef.current) return;
    handoffFinishedRef.current = true;
    onHandoffComplete?.();
  }, [onHandoffComplete]);

  useLayoutEffect(() => {
    if (!handoffActive || !shellRef.current) return;

    handoffFinishedRef.current = false;
    dockReadySentRef.current = false;

    const shell = shellRef.current;
    shell.style.transform = "";
    stabilizeSplineForHandoff(shell);
    clearHandoffFramingLock(shell);

    const sourceRect = normalizeRect(shell.getBoundingClientRect());
    if (!sourceRect.width) return;
    let target = null;
    let pendingTarget = null;
    let stableReads = 0;
    let attempts = 0;
    let frame = 0;
    let startTime = 0;
    let endScale = 1;
    let targetCenter = getRectCenter(sourceRect);
    const sourceCenter = getRectCenter(sourceRect);

    const animate = (now) => {
      if (!target) {
        const dockEl = galleryDockRef?.current;
        if (!dockEl?.offsetWidth) {
          if (attempts < 120) {
            attempts += 1;
            frame = requestAnimationFrame(animate);
          } else {
            completeHandoff();
          }
          return;
        }

        const nextTarget = getVisualRect(dockEl);
        if (pendingTarget && rectsNear(pendingTarget, nextTarget)) {
          stableReads += 1;
        } else {
          pendingTarget = nextTarget;
          stableReads = 1;
        }

        if (stableReads < 2) {
          frame = requestAnimationFrame(animate);
          return;
        }

        target = pendingTarget;
        endScale = getUniformFitScale(sourceRect, target);
        targetCenter = getRectCenter(target);
        startTime = now;
      }

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / HANDOFF_MS);
      const eased = easeInOutCubic(progress);
      const dx = lerp(0, targetCenter.x - sourceCenter.x, eased);
      const dy = lerp(0, targetCenter.y - sourceCenter.y, eased);
      const scale = lerp(1, endScale, eased);

      applyUniformHandoffFrame(shell, sourceRect, dx, dy, scale);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        applyShellRect(shell, target);
        shell.style.transform = "";
        clearHandoffFramingLock(shell);
        commitGalleryFraming(shell);
        completeHandoff();
      }
    };

    frame = requestAnimationFrame(animate);
    const fallback = window.setTimeout(completeHandoff, HANDOFF_MS + 500);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, [handoffActive, scanStageRef, galleryDockRef, completeHandoff]);

  useLayoutEffect(() => {
    if (!handoffLanding || specimenDocked || dockReadySentRef.current) return undefined;

    const timer = window.setTimeout(() => {
      if (dockReadySentRef.current) return;
      dockReadySentRef.current = true;
      onDockReady?.();
    }, HANDOFF_SETTLE_MS);

    return () => window.clearTimeout(timer);
  }, [handoffLanding, specimenDocked, onDockReady]);

  useLayoutEffect(() => {
    if (!specimenDocked || scanOpen || detailOpen || !shellRef.current) return undefined;

    const syncToGallery = () => {
      const dockEl = galleryDockRef?.current;
      const shell = shellRef.current;
      if (dockEl?.offsetWidth && shell) {
        applyShellRect(shell, getVisualRect(dockEl));
        shell.style.transform = "";
      }
    };

    syncToGallery();
    let frame = requestAnimationFrame(function followDock() {
      syncToGallery();
      frame = requestAnimationFrame(followDock);
    });

    window.addEventListener("resize", syncToGallery);

    const dockEl = galleryDockRef?.current;
    const resizeObserver = dockEl ? new ResizeObserver(syncToGallery) : null;
    resizeObserver?.observe(dockEl);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncToGallery);
      resizeObserver?.disconnect();
    };
  }, [specimenDocked, scanOpen, detailOpen, galleryDockRef]);

  useEffect(() => {
    if (handoffActive) {
      dockReadySentRef.current = false;
      handoffFinishedRef.current = false;
    }
  }, [handoffActive]);

  const detailSuppressed = detailOpen && !scanOpen && !handoffInFlight;

  const shellClass = [
    "scan-specimen-flyer-shell",
    scanOpen && introComplete && !handoffInFlight
      ? "scan-specimen-flyer-shell--interactive"
      : "",
    handoffInFlight ? "scan-specimen-flyer-shell--handoff" : "",
    detailSuppressed ? "scan-specimen-flyer-shell--detail-suppressed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const motionClass = [
    "scan-specimen-motion",
    scanOpen && !splineLocked && !introComplete ? "scan-specimen-entrance" : "",
    scanOpen && introComplete && !splineLocked ? "scan-specimen-entrance--settled" : "",
    specimenDocked && !scanOpen && !handoffInFlight && !detailSuppressed
      ? "plankton-visual--float"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const specimenNode = (
    <div ref={assignShellRef} className={shellClass}>
      <div ref={motionRef} className={motionClass}>
        <SplinePlanktonViewer
          key="scan-handoff-specimen"
          url={scanSpecimen.splineUrl}
          viewerSrc={scanSpecimen.splineViewer}
          className={useGalleryFraming ? "plankton-spline-viewer" : "detail-spline-viewer"}
          zoomScale={useGalleryFraming ? GALLERY_SPLINE_ZOOM : SCAN_SPLINE_ZOOM}
          fillFactor={useGalleryFraming ? GALLERY_FILL_FACTOR : 0.68}
          limitZoom
          introTurntableMs={scanOpen && !introComplete ? INTRO_MS : null}
          introTurntableRotations={2}
          frozen={splineLocked}
          resizeFrozen={scanOpen && !introComplete && !splineLocked}
        />
      </div>
    </div>
  );

  if (!scanOpen && !specimenDocked) return null;

  return createPortal(specimenNode, document.body);
}
