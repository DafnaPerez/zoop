import { publicUrl } from "../utils/publicUrl";

/** Scan pipeline always resolves to this specimen. */
export const scanSpecimen = {
  id: "belzebub-hanseni",
  name: "Belzebub hanseni",
  taxonomy: "Luciferid shrimp",
  habitat:
    "Indo-West Pacific; also introduced to the eastern Mediterranean. Common in coastal, shallow, and mangrove-associated waters.",
  size: "9–12 mm as an adult.",
  scaleMaxMm: 12,
  detailSections: [
    {
      label: "Appearance",
      text: "Very small, transparent, elongated shrimp-like crustacean. Body is laterally compressed, with conspicuous dark stalked eyes, a narrow anterior region, delicate appendages, and a reduced, modified shrimp form.",
    },
    {
      label: "Ecology",
      text: "Marine and brackish planktonic shrimp. Known for bioluminescence: luciferid shrimps are named after their light-producing ability, and their transparent bodies make this luminous quality especially visually striking.",
    },
  ],
  viewer: "spline",
  splineUrl: publicUrl("/models/Belzebub_hanseni_scene_spliecode.splinecode"),
  splineViewer: publicUrl("/models/Belzebub_hanseni_spline_viewer.js"),
  scanZoomScale: 1.15,
  galleryZoomScale: 1.28,
  galleryFillFactor: 0.84,
  detailZoomScale: 1.55,
  layout: { top: "12%", left: "8%", width: "18%", zIndex: 2 },
};

export const SCAN_ACCURACY = 100;
