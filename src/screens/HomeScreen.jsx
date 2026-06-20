import { useEffect } from "react";
import PlanktonGallery from "../components/PlanktonGallery";
import { preloadSplineViewerAssets } from "../components/SplinePlanktonViewer";
import { SHARED_SPLINE_VIEWER } from "../utils/splineRuntime";

export default function HomeScreen({
  collection,
  onSelect,
  onScanComplete,
  onScanPanelChange,
  focusPlanktonId,
  handoffActive,
  galleryDockRef,
  specimenDocked,
  concealed,
  behind = false,
}) {
  useEffect(() => {
    preloadSplineViewerAssets(SHARED_SPLINE_VIEWER);
    [...new Set(collection.map((p) => p.splineUrl).filter(Boolean))].forEach((url) =>
      preloadSplineViewerAssets(SHARED_SPLINE_VIEWER, url),
    );
  }, [collection]);

  return (
    <PlanktonGallery
      planktons={collection}
      onSelect={onSelect}
      onScanComplete={onScanComplete}
      onScanPanelChange={onScanPanelChange}
      focusPlanktonId={focusPlanktonId}
      handoffActive={handoffActive}
      galleryDockRef={galleryDockRef}
      specimenDocked={specimenDocked}
      concealed={concealed}
      behind={behind}
    />
  );
}
