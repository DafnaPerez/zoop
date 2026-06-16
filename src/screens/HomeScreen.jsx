import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import PlanktonGallery from "../components/PlanktonGallery";
import { preloadSplineViewerAssets } from "../components/SplinePlanktonViewer";
import { SHARED_SPLINE_VIEWER } from "../utils/splineRuntime";

export default function HomeScreen({
  collection,
  onSelect,
  onScanComplete,
  onScanPanelChange,
  onScanPhaseChange,
  focusPlanktonId,
  handoffActive,
  galleryDockRef,
  specimenDocked,
  concealed,
  behind = false,
  scanPanelOpen = false,
  scanFlowActive = false,
  scanProcessing = false,
  galleryGpuReleased = false,
  galleryGpuEpoch = 0,
}) {
  useEffect(() => {
    preloadSplineViewerAssets(SHARED_SPLINE_VIEWER);
    [...new Set(collection.map((p) => p.model).filter(Boolean))].forEach((model) =>
      useGLTF.preload(model),
    );
  }, [collection]);

  return (
    <PlanktonGallery
      planktons={collection}
      onSelect={onSelect}
      onScanComplete={onScanComplete}
      onScanPanelChange={onScanPanelChange}
      onScanPhaseChange={onScanPhaseChange}
      focusPlanktonId={focusPlanktonId}
      handoffActive={handoffActive}
      galleryDockRef={galleryDockRef}
      specimenDocked={specimenDocked}
      concealed={concealed}
      behind={behind}
      scanPanelOpen={scanPanelOpen}
      scanFlowActive={scanFlowActive}
      scanProcessing={scanProcessing}
      galleryGpuReleased={galleryGpuReleased}
      galleryGpuEpoch={galleryGpuEpoch}
    />
  );
}
