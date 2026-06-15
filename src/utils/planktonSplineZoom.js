export const DETAIL_SPLINE_ZOOM = 0.7;

export function getPlanktonSplineZoomScale(plankton, { context = "detail" } = {}) {
  const multiplier =
    context === "gallery"
      ? (plankton.galleryZoomScale ?? plankton.detailZoomScale ?? 1)
      : (plankton.detailZoomScale ?? 1);

  return DETAIL_SPLINE_ZOOM * multiplier;
}
