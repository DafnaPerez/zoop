import { publicUrl } from "./publicUrl";
import { getPlanktonSplineZoomScale } from "./planktonSplineZoom";

export function getCompareSpecimenIframeSrc(plankton) {
  const params = new URLSearchParams({
    scene: plankton.splineUrl,
    zoom: String(getPlanktonSplineZoomScale(plankton, { context: "compare" })),
    fill: String(plankton.compareFillFactor ?? plankton.detailFillFactor ?? 0.68),
  });

  if (plankton.compareFitContain) {
    params.set("fitContain", "1");
  }

  return `${publicUrl("compare-specimen.html")}?${params.toString()}`;
}
