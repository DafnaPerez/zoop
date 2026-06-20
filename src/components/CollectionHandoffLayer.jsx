import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { scanSpecimen } from "../data/scanSpecimen";

const HANDOFF_MS = 2400;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function snapshotRect(rect) {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function applyCenterRect(el, centerX, centerY, width, height) {
  el.style.left = `${centerX - width / 2}px`;
  el.style.top = `${centerY - height / 2}px`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
}

function interpolateCenterRect(start, end, t) {
  const startCenter = rectCenter(start);
  const endCenter = rectCenter(end);

  return {
    centerX: lerp(startCenter.x, endCenter.x, t),
    centerY: lerp(startCenter.y, endCenter.y, t),
    width: lerp(start.width, end.width, t),
    height: lerp(start.height, end.height, t),
  };
}

export default function CollectionHandoffLayer({
  active,
  startSpecimenRect,
  specimenTargetRef,
  onComplete,
}) {
  const specimenFlyerRef = useRef(null);

  useLayoutEffect(() => {
    if (!active || !startSpecimenRect) return undefined;

    const specimenEl = specimenFlyerRef.current;
    if (!specimenEl) return undefined;

    const startSpecimenCenter = rectCenter(startSpecimenRect);

    applyCenterRect(
      specimenEl,
      startSpecimenCenter.x,
      startSpecimenCenter.y,
      startSpecimenRect.width,
      startSpecimenRect.height,
    );

    let waitFrames = 0;
    let startTime = 0;
    let endSpecimenRect = null;
    let frame = 0;

    const tick = (now) => {
      if (!endSpecimenRect) {
        const targetSpecimen = specimenTargetRef?.current?.getBoundingClientRect();

        if (!targetSpecimen?.width) {
          if (waitFrames < 120) {
            waitFrames += 1;
            frame = requestAnimationFrame(tick);
            return;
          }

          onComplete?.();
          return;
        }

        endSpecimenRect = snapshotRect(targetSpecimen);
        startTime = now;
      }

      const progress = Math.min(1, (now - startTime) / HANDOFF_MS);
      const eased = easeInOutCubic(progress);

      const specimenFrame = interpolateCenterRect(
        startSpecimenRect,
        endSpecimenRect,
        eased,
      );
      applyCenterRect(
        specimenEl,
        specimenFrame.centerX,
        specimenFrame.centerY,
        specimenFrame.width,
        specimenFrame.height,
      );

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }

      onComplete?.();
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [active, startSpecimenRect, specimenTargetRef, onComplete]);

  if (!active || !startSpecimenRect) return null;

  return createPortal(
    <div ref={specimenFlyerRef} className="specimen-handoff-flight">
      <img src={scanSpecimen.galleryImage} alt="" draggable={false} />
    </div>,
    document.body,
  );
}
