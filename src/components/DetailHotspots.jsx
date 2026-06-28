import { useEffect, useRef } from "react";
import {
  getSplineViewerFromHost,
  projectSplineHotspots,
} from "../utils/splineHotspotProjection";

const SHOW_FACING = 0.32;
const HIDE_FACING = 0.22;

export default function DetailHotspots({
  hotspots,
  viewerHostRef,
  calloutId,
  focusedId,
  onHoverStart,
  onHoverEnd,
}) {
  const anchorRefs = useRef({});
  const visibilityRef = useRef({});

  useEffect(() => {
    if (!hotspots?.length || !viewerHostRef) return undefined;

    let frame = 0;

    const tick = () => {
      const host = viewerHostRef.current;
      const viewer = getSplineViewerFromHost(host);
      const spline = viewer?._spline;

      if (host && spline) {
        const positions = projectSplineHotspots(spline, host, hotspots);

        for (const hotspot of hotspots) {
          const anchor = anchorRefs.current[hotspot.id];
          const position = positions[hotspot.id];
          if (!anchor || !position) continue;

          const isPinned = hotspot.id === focusedId || hotspot.id === calloutId;
          const wasVisible = visibilityRef.current[hotspot.id] ?? false;
          let visible =
            position.inViewport &&
            !position.occluded &&
            position.facingScore > SHOW_FACING;

          if (isPinned && position.inViewport) {
            visible = true;
          } else if (
            !visible &&
            wasVisible &&
            position.inViewport &&
            !position.occluded &&
            position.facingScore > HIDE_FACING
          ) {
            visible = true;
          }

          visibilityRef.current[hotspot.id] = visible;

          anchor.style.left = `${position.x}%`;
          anchor.style.top = `${position.y}%`;
          anchor.classList.toggle("detail-hotspot-anchor--hidden", !visible);
          anchor.classList.toggle("detail-hotspot-anchor--callout-left", position.x > 68);
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hotspots, viewerHostRef, calloutId, focusedId]);

  if (!hotspots?.length) return null;

  return (
    <div className="detail-hotspot-layer">
      {hotspots.map((hotspot) => {
        const showCallout = calloutId === hotspot.id;
        const isFocused = focusedId === hotspot.id;

        return (
          <div
            key={hotspot.id}
            ref={(node) => {
              if (node) anchorRefs.current[hotspot.id] = node;
              else delete anchorRefs.current[hotspot.id];
            }}
            className={`detail-hotspot-anchor detail-hotspot-anchor--hidden${
              showCallout || isFocused ? " detail-hotspot-anchor--active" : ""
            }`}
          >
            <button
              type="button"
              className={`detail-hotspot${showCallout ? " detail-hotspot--active" : ""}`}
              aria-label={hotspot.label}
              aria-expanded={showCallout}
              onMouseEnter={() => onHoverStart?.(hotspot.id)}
              onMouseLeave={() => onHoverEnd?.()}
              onFocus={() => onHoverStart?.(hotspot.id)}
              onBlur={() => onHoverEnd?.()}
            >
              <span className="detail-hotspot-ring" aria-hidden="true" />
              <span className="detail-hotspot-core" aria-hidden="true" />
            </button>

            <div
              className={`detail-hotspot-callout${
                showCallout ? " detail-hotspot-callout--visible" : ""
              }`}
              role="tooltip"
            >
              <p className="detail-hotspot-callout-label">{hotspot.label}</p>
              <p className="detail-hotspot-callout-text">{hotspot.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
