import { getSplineViewerFromHost } from "./splineHotspotProjection";

export function getSplineViewerZoomRatio(host) {
  const viewer = getSplineViewerFromHost(host);
  const base = viewer?._baseSplineZoom;
  const current = viewer?._spline?._controls?.orbitControls?.object?.zoom;

  if (!base || !Number.isFinite(current) || base <= 0) {
    return 1;
  }

  return current / base;
}
