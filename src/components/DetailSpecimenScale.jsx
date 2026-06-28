import { useEffect, useMemo, useState } from "react";
import { getSplineViewerZoomRatio } from "../utils/splineViewerZoom";

function formatMmLabel(mm) {
  const rounded = Math.round(mm * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

const NICE_STEPS = [0.25, 0.5, 1, 2, 5, 10, 15, 20, 25, 50];

function pickLabelStep(spanMm, maxLabels = 6) {
  let chosen = NICE_STEPS[0];
  for (const step of NICE_STEPS) {
    const labelCount = Math.floor(spanMm / step) + 1;
    if (labelCount <= maxLabels && labelCount >= 3) {
      chosen = step;
    }
  }
  return chosen;
}

function pickTickStep(spanMm, labelStep, maxTicks = 12) {
  const labelIndex = NICE_STEPS.indexOf(labelStep);
  for (let index = labelIndex; index >= 0; index -= 1) {
    const step = NICE_STEPS[index];
    if (spanMm / step <= maxTicks) return step;
  }
  return labelStep;
}

function isMultipleOf(value, step) {
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-4;
}

function buildScaleTicks(spanMm, tickStep, labelStep) {
  const ticks = [];
  const endMm = Number(spanMm.toFixed(2));
  const mergeEndThreshold = labelStep * 0.5;

  for (let mm = 0; mm <= endMm + 1e-6; mm += tickStep) {
    const value = Number(mm.toFixed(2));
    const showLabel = isMultipleOf(value, labelStep);
    ticks.push({
      mm: value,
      major: showLabel,
      label: showLabel ? formatMmLabel(value) : null,
    });
  }

  const last = ticks[ticks.length - 1];
  if (!last) {
    return [
      {
        mm: endMm,
        major: true,
        label: formatMmLabel(endMm),
      },
    ];
  }

  const gap = endMm - last.mm;
  if (gap <= mergeEndThreshold) {
    last.mm = endMm;
    last.major = true;
    last.label = formatMmLabel(endMm);
    return ticks;
  }

  if (gap > 0.05) {
    ticks.push({
      mm: endMm,
      major: true,
      label: formatMmLabel(endMm),
    });
  } else if (last.label == null) {
    last.major = true;
    last.label = formatMmLabel(endMm);
  }

  return ticks;
}

export default function DetailSpecimenScale({
  maxMm = 3,
  viewerHostRef,
  trackZoom = false,
}) {
  const [zoomRatio, setZoomRatio] = useState(1);

  useEffect(() => {
    if (!trackZoom || !viewerHostRef) return undefined;

    let frame = 0;
    let lastRatio = 1;

    const tick = () => {
      const host = viewerHostRef.current;
      if (host) {
        const ratio = getSplineViewerZoomRatio(host);
        if (Math.abs(ratio - lastRatio) > 0.015) {
          lastRatio = ratio;
          setZoomRatio(ratio);
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [trackZoom, viewerHostRef]);

  const spanMm = maxMm / zoomRatio;
  const labelStep = pickLabelStep(spanMm);
  const tickStep = pickTickStep(spanMm, labelStep);
  const ticks = useMemo(
    () => buildScaleTicks(spanMm, tickStep, labelStep),
    [spanMm, tickStep, labelStep],
  );
  const displayMaxMm = ticks[ticks.length - 1]?.mm ?? spanMm;

  return (
    <div
      className="detail-scale-ref"
      style={{ "--scale-max-mm": displayMaxMm }}
      aria-label={`Size reference, zero to ${formatMmLabel(displayMaxMm)} millimeters at current zoom`}
    >
      <div className="detail-scale-ref-meta">
        <span className="detail-scale-ref-heading">Scale</span>
        <span className="detail-scale-ref-units">MM</span>
      </div>

      <div className="detail-scale-ref-ruler" aria-hidden="true">
        <span className="detail-scale-ref-bar" />
        {ticks.map(({ mm, major, label }, index) => {
          const isStart = index === 0;
          const isEnd = index === ticks.length - 1;

          return (
            <span
              key={`${mm}-${index}`}
              className={`detail-scale-ref-tick${
                major ? " detail-scale-ref-tick--major" : ""
              }${isStart ? " detail-scale-ref-tick--start" : ""}${
                isEnd ? " detail-scale-ref-tick--end" : ""
              }`}
              style={{ "--tick-mm": mm }}
            >
              {label != null ? (
                <span className="detail-scale-ref-tick-label">{label}</span>
              ) : null}
              <span className="detail-scale-ref-tick-mark" />
            </span>
          );
        })}
      </div>
    </div>
  );
}
