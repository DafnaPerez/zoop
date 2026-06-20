import { publicUrl } from "../utils/publicUrl";

/** Scan pipeline always resolves to this specimen. */
export const scanSpecimen = {
  id: "belzebub-hanseni",
  name: "Belzebub hanseni",
  taxonomy: "Luciferid shrimp",
  habitat: "Indo-West Pacific, eastern Mediterranean.",
  size: "9–12 mm as an adult.",
  scaleMaxMm: 12,
  detailSections: [
    {
      label: "Appearance",
      text: "Tiny transparent shrimp-like body with dark stalked eyes and delicate appendages.",
    },
    {
      label: "Ecology",
      text: "Known for bioluminescence: luciferid shrimps are named after their light-producing ability.",
    },
  ],
  viewer: "spline",
  splineUrl: publicUrl("/models/Belzebub_hanseni_scene_spliecode.splinecode"),
  splineViewer: publicUrl("/models/Belzebub_hanseni_spline_viewer.js"),
  scanZoomScale: 1.15,
  galleryZoomScale: 2.7,
  galleryOffsetX: -28,
  detailZoomScale: 1.55,
  galleryImage: publicUrl("/gallery/belzebub-hanseni.png"),
  layout: { top: "12%", left: "8%", width: "18%", zIndex: 2 },
};

export const SCAN_ACCURACY = 100;
