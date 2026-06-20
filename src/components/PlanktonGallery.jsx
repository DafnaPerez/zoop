import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BlueprintFrame, BlueprintScaffold } from "./BlueprintScaffold";
import PlanktonScan from "./PlanktonScan";
import PlanktonSearch from "./PlanktonSearch";
import PlanktonVisual from "./PlanktonVisual";
import { preloadSplineViewerAssets } from "./SplinePlanktonViewer";
import { scanSpecimen } from "../data/scanSpecimen";

const VISIBLE_RADIUS = 2;
const SWIPE_THRESHOLD = 48;
const DRAG_START_THRESHOLD = 8;
const WHEEL_SETTLE_MS = 120;
const SIDE_OFFSET_X = 400;
const INNER_OFFSET_X = SIDE_OFFSET_X + 30;
const MAX_DRAG_PX = INNER_OFFSET_X * 1.15;
const SIDE_OFFSET_Y = 150;
const CENTER_SCALE = 1.2;
const INNER_SCALE = 0.58 * 1.2 * 1.2;
const OUTER_SCALE = 0.58 * 1.2 * 0.84;
const OUTER_OFFSET_Y = 230;
const OUTER_RIGHT_EXTRA_Y = 15;
const OUTER_X_INSET = 100;
const INNER_BLUR = 1;
const OUTER_BLUR = 3.5;

function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function getCarouselMetrics(visualOffset, slotOffset) {
  const visualDistance = Math.abs(visualOffset);
  const sign = Math.sign(visualOffset || slotOffset) || 1;

  let scale;
  let blur;
  let opacity;
  let y;
  let x;
  let zIndex;

  if (visualDistance <= 1) {
    const t = clamp01(visualDistance);
    scale = lerp(CENTER_SCALE, INNER_SCALE, t);
    blur = lerp(0, INNER_BLUR, t);
    opacity = lerp(1, 0.9, t);
    y = visualDistance * SIDE_OFFSET_Y;
    x = visualOffset * INNER_OFFSET_X;
    zIndex = t < 0.35 ? 30 : 20;
  } else {
    const t = clamp01(visualDistance - 1);
    scale = lerp(INNER_SCALE, OUTER_SCALE, t);
    blur = lerp(INNER_BLUR, OUTER_BLUR, t);
    opacity = lerp(0.9, 0.78, t);
    y = lerp(
      SIDE_OFFSET_Y,
      OUTER_OFFSET_Y + (slotOffset > 0 ? OUTER_RIGHT_EXTRA_Y : 0),
      t,
    );
    x = sign * (visualDistance * SIDE_OFFSET_X - OUTER_X_INSET);
    zIndex = 10;
  }

  return {
    x,
    y,
    scale,
    blur,
    opacity,
    zIndex,
    visible: true,
  };
}

function getWrappedSlot(index, centerIndex, length) {
  let slot = index - centerIndex;
  if (slot > length / 2) slot -= length;
  if (slot < -length / 2) slot += length;
  return slot;
}

function resolveDragSteps(deltaPx, startIndex, length, slideThreshold) {
  if (Math.abs(deltaPx) < slideThreshold) {
    return { nextIndex: startIndex, remainderPx: 0 };
  }

  let steps = Math.trunc(-deltaPx / INNER_OFFSET_X);
  if (steps === 0) {
    steps = deltaPx > 0 ? -1 : 1;
  }

  return {
    nextIndex: wrapIndex(startIndex + steps, length),
    remainderPx: deltaPx + steps * INNER_OFFSET_X,
  };
}

function getFocusIndex(planktons, focusPlanktonId) {
  if (!focusPlanktonId) return 0;
  const index = planktons.findIndex((entry) => entry.id === focusPlanktonId);
  return index >= 0 ? index : 0;
}

export default function PlanktonGallery({
  planktons,
  onSelect,
  onScanComplete,
  focusPlanktonId = null,
  handoffActive = false,
  galleryDockRef = null,
  specimenDocked = false,
  concealed = false,
  behind = false,
  onScanPanelChange = null,
  onScanPhaseChange = null,
}) {
  const [activeIndex, setActiveIndex] = useState(() =>
    getFocusIndex(planktons, focusPlanktonId),
  );
  const [dragPx, setDragPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const trackRef = useRef(null);
  const dragStartX = useRef(0);
  const dragStartIndex = useRef(0);
  const pointerDown = useRef(false);
  const didDrag = useRef(false);
  const activePointerId = useRef(null);
  const activeIndexRef = useRef(activeIndex);
  const wheelAccumRef = useRef(0);
  const wheelStartIndexRef = useRef(0);
  const wheelTimerRef = useRef(null);
  const settleRafRef = useRef(null);
  const settleTimerRef = useRef(null);

  const clearSettle = useCallback(() => {
    if (settleRafRef.current) {
      cancelAnimationFrame(settleRafRef.current);
      settleRafRef.current = null;
    }
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    setIsSettling(false);
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      clearSettle();
    };
  }, [clearSettle]);

  const focusIndex = getFocusIndex(planktons, focusPlanktonId);
  const centerIndex =
    focusPlanktonId && planktons[focusIndex]?.id === focusPlanktonId
      ? focusIndex
      : activeIndex;
  const isSliding = isDragging || isSettling || Math.abs(dragPx) > 0.5;

  useEffect(() => {
    const plankton = planktons[centerIndex];
    if (!plankton || plankton.viewer !== "spline") return;
    preloadSplineViewerAssets(plankton.splineViewer, plankton.splineUrl);
  }, [centerIndex, planktons]);

  const clampDragPx = useCallback(
    (px) => Math.max(-MAX_DRAG_PX, Math.min(MAX_DRAG_PX, px)),
    [],
  );

  const goTo = useCallback((index) => {
    clearSettle();
    setActiveIndex(wrapIndex(index, planktons.length));
    setDragPx(0);
    setIsDragging(false);
  }, [clearSettle, planktons.length]);

  const goNext = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  const goPrev = useCallback(() => {
    goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  useLayoutEffect(() => {
    if (!focusPlanktonId) return;
    const index = planktons.findIndex((entry) => entry.id === focusPlanktonId);
    if (index >= 0) {
      setActiveIndex(index);
      setDragPx(0);
    }
  }, [focusPlanktonId, planktons]);

  const finishDrag = useCallback(
    (deltaPx, startIndex = dragStartIndex.current) => {
      const trackWidth = trackRef.current?.clientWidth ?? window.innerWidth;
      const slideThreshold = Math.max(SWIPE_THRESHOLD, trackWidth * 0.08);
      const { nextIndex, remainderPx } = resolveDragSteps(
        deltaPx,
        startIndex,
        planktons.length,
        slideThreshold,
      );

      clearSettle();

      if (nextIndex !== startIndex) {
        setActiveIndex(nextIndex);
        setDragPx(remainderPx);
      }

      setIsDragging(false);
      setIsSettling(true);
      settleRafRef.current = requestAnimationFrame(() => {
        settleRafRef.current = null;
        setDragPx(0);
        settleTimerRef.current = window.setTimeout(() => {
          settleTimerRef.current = null;
          setIsSettling(false);
        }, 460);
      });
    },
    [clearSettle, planktons.length],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const getWheelDelta = (event) => {
      if (event.deltaMode === 1) return event.deltaX * 16;
      if (event.deltaMode === 2) return event.deltaX * track.clientWidth;
      return event.deltaX;
    };

    const onWheel = (event) => {
      if (event.ctrlKey || event.metaKey) return;

      const deltaX = getWheelDelta(event);
      const deltaY =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * track.clientHeight
            : event.deltaY;

      const horizontalGesture =
        Math.abs(deltaX) > Math.abs(deltaY) * 0.55 || (event.shiftKey && Math.abs(deltaY) > 0);

      if (!horizontalGesture) return;

      const delta = event.shiftKey && Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;
      if (!delta) return;

      event.preventDefault();

      if (wheelTimerRef.current === null) {
        wheelStartIndexRef.current = activeIndexRef.current;
        wheelAccumRef.current = 0;
      }

      const maxWheelPx = INNER_OFFSET_X * planktons.length;
      wheelAccumRef.current = Math.max(
        -maxWheelPx,
        Math.min(maxWheelPx, wheelAccumRef.current - delta),
      );
      setDragPx(wheelAccumRef.current);
      setIsDragging(true);

      window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(() => {
        wheelTimerRef.current = null;
        finishDrag(wheelAccumRef.current, wheelStartIndexRef.current);
        wheelAccumRef.current = 0;
      }, WHEEL_SETTLE_MS);
    };

    track.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      track.removeEventListener("wheel", onWheel);
      if (wheelTimerRef.current) {
        window.clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = null;
      }
    };
  }, [finishDrag, planktons.length]);

  const onPointerDown = (event) => {
    if (event.button !== 0) return;

    if (settleRafRef.current || settleTimerRef.current) {
      clearSettle();
      setDragPx(0);
    }

    pointerDown.current = true;
    didDrag.current = false;
    activePointerId.current = event.pointerId;
    dragStartX.current = event.clientX;
    dragStartIndex.current = activeIndex;
  };

  const onPointerMove = (event) => {
    if (!pointerDown.current || event.pointerId !== activePointerId.current) return;

    const deltaPx = event.clientX - dragStartX.current;

    if (!isDragging && Math.abs(deltaPx) < DRAG_START_THRESHOLD) return;

    if (!isDragging) {
      didDrag.current = true;
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    setDragPx(clampDragPx(deltaPx));
  };

  const onPointerUp = (event) => {
    if (!pointerDown.current || event.pointerId !== activePointerId.current) return;

    const deltaPx = event.clientX - dragStartX.current;
    pointerDown.current = false;
    activePointerId.current = null;

    if (isDragging) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      finishDrag(deltaPx);
      return;
    }

    setDragPx(0);
  };

  const onPointerCancel = (event) => {
    if (!pointerDown.current) return;

    pointerDown.current = false;
    activePointerId.current = null;

    if (isDragging) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      finishDrag(0);
      return;
    }

    setDragPx(0);
  };

  const handleItemClick = (index, offset) => {
    if (didDrag.current) return;

    if (offset === 0) {
      onSelect(planktons[index].id);
      return;
    }

    goTo(index);
  };

  const activePlankton = planktons[centerIndex];
  const dragOffset = dragPx / INNER_OFFSET_X;
  const edgeBuffer = 0.45 + Math.abs(dragOffset) * 0.15;

  return (
    <main
      className={`gallery-screen${handoffActive ? " gallery-screen--handoff" : ""}${concealed ? " gallery-screen--concealed" : ""}${behind ? " gallery-screen--behind" : ""}`}
    >
      <BlueprintScaffold />
      <div className="gallery-glow gallery-glow-primary" aria-hidden="true" />
      <div className="gallery-glow gallery-glow-secondary" aria-hidden="true" />

      <header className="gallery-header">
        <div className="gallery-header-top">
          <span className="gallery-header-spacer" aria-hidden="true" />
          <p className="gallery-eyebrow">Plankton Atlas</p>
          <div className="gallery-header-actions">
            <PlanktonScan
              onScanComplete={onScanComplete}
              onExpandedChange={onScanPanelChange}
              onScanPhaseChange={onScanPhaseChange}
            />
            <PlanktonSearch
              planktons={planktons}
              onSelect={(index) => onSelect(planktons[index].id)}
            />
          </div>
        </div>
        <h1 className="gallery-title">Explore the collection</h1>
      </header>

      <div
        ref={trackRef}
        className={`gallery-track${isDragging ? " gallery-track--dragging" : ""}${isSliding ? " gallery-track--sliding" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="gallery-specimen-portal" aria-hidden="true">
          <BlueprintFrame />
        </div>

        {planktons.map((plankton, index) => {
          const slot = getWrappedSlot(index, centerIndex, planktons.length);
          const visualOffset = slot + dragOffset;
          const inView = Math.abs(visualOffset) <= VISIBLE_RADIUS + edgeBuffer;

          if (!inView) return null;

          const metrics = getCarouselMetrics(visualOffset, slot);
          const isCenterVisual = slot === 0 && Math.abs(dragOffset) < 0.08;

          const isHandoffTarget =
            handoffActive && slot === 0 && plankton.id === focusPlanktonId;
          const useDockHost =
            plankton.id === scanSpecimen.id && (handoffActive || specimenDocked);

          return (
            <button
              key={plankton.id}
              type="button"
              className={`gallery-item${isCenterVisual ? " gallery-item--active" : ""}${Math.abs(slot) >= 2 ? " gallery-item--outer" : ""}${isHandoffTarget ? " gallery-item--handoff-target" : ""}`}
              style={{
                zIndex: inView ? metrics.zIndex : -1,
                opacity: inView ? metrics.opacity : 0,
                visibility: inView ? "visible" : "hidden",
                pointerEvents: inView ? "auto" : "none",
                filter: inView ? `blur(${metrics.blur}px)` : "none",
                transform: `translate(-50%, -50%) translate(${metrics.x}px, ${metrics.y + (plankton.galleryOffsetY ?? 0)}px) scale(${metrics.scale})`,
              }}
              onClick={() => handleItemClick(index, slot)}
              aria-label={plankton.name}
              aria-current={slot === 0 ? "true" : undefined}
              title={slot === 0 ? "Open species details" : undefined}
            >
              <div
                className="gallery-item-inner"
                style={{ animationDelay: `${Math.abs(slot) * 0.35}s` }}
              >
                <div className="gallery-handoff-target-box">
                  {useDockHost ? (
                    <div
                      ref={galleryDockRef}
                      className="plankton-visual plankton-visual--docked-host"
                      aria-hidden="true"
                    />
                  ) : (
                    <div
                      className={`gallery-model-host${concealed || behind ? " gallery-model-host--hidden" : ""}`}
                      aria-hidden={concealed || behind}
                    >
                      <PlanktonVisual
                        plankton={plankton}
                        offset={slot}
                        float
                      />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="gallery-footer">
        <p className="gallery-active-name">{activePlankton.name}</p>
        <p className="gallery-active-taxonomy">{activePlankton.taxonomy}</p>
        <p className="gallery-open-hint">Click specimen to inspect</p>

        <div className="gallery-controls">
          <button
            type="button"
            className="gallery-nav-btn"
            onClick={goPrev}
            aria-label="Previous plankton"
          >
            ←
          </button>
          <span className="gallery-counter">
            {String(centerIndex + 1).padStart(2, "0")} / {String(planktons.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            className="gallery-nav-btn"
            onClick={goNext}
            aria-label="Next plankton"
          >
            →
          </button>
        </div>
      </div>
    </main>
  );
}
