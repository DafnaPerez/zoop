export const DETAIL_SPLINE_ZOOM = 0.7;
const SEARCH_THUMB_ZOOM_DEFAULT = 1.1 / DETAIL_SPLINE_ZOOM;

export function getPlanktonSplineZoomScale(plankton, { context = "detail" } = {}) {
  const multiplier =
    context === "gallery"
      ? (plankton.galleryZoomScale ?? plankton.detailZoomScale ?? 1)
      : context === "search"
        ? (plankton.searchThumbZoomScale ??
          plankton.galleryZoomScale ??
          plankton.detailZoomScale ??
          SEARCH_THUMB_ZOOM_DEFAULT)
        : (plankton.detailZoomScale ?? 1);

  return DETAIL_SPLINE_ZOOM * multiplier;
}
