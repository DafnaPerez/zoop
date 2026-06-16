import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { planktons } from "./data/planktons";
import { scanSpecimen } from "./data/scanSpecimen";
import { usePreventBrowserZoom } from "./hooks/usePreventBrowserZoom";
import { preloadSplineViewerAssets } from "./components/SplinePlanktonViewer";
import HandoffSpecimenLayer from "./components/HandoffSpecimenLayer";
import HomeScreen from "./screens/HomeScreen";
import DetailScreen from "./screens/DetailScreen";
import ScanScreen from "./screens/ScanScreen";
import "./style.css";

function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

export default function App() {
  usePreventBrowserZoom();
  const scanStageRef = useRef(null);
  const handoffShellRef = useRef(null);
  const galleryDockRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [scanAdded, setScanAdded] = useState(false);
  const [scanPreview, setScanPreview] = useState(null);
  const [scanResultOpen, setScanResultOpen] = useState(false);
  const [scanExiting, setScanExiting] = useState(false);
  const [galleryFocusId, setGalleryFocusId] = useState(null);
  const [galleryRestoreId, setGalleryRestoreId] = useState(null);
  const [scanPanelOpen, setScanPanelOpen] = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [galleryGpuEpoch, setGalleryGpuEpoch] = useState(0);
  const [handoffStartRect, setHandoffStartRect] = useState(null);
  const [handoffLanding, setHandoffLanding] = useState(false);
  const [specimenDocked, setSpecimenDocked] = useState(false);

  const collection = useMemo(
    () => (scanAdded ? [...planktons, scanSpecimen] : planktons),
    [scanAdded],
  );

  const selectedIndex = collection.findIndex((entry) => entry.id === selectedId);
  const selectedPlankton = selectedIndex >= 0 ? collection[selectedIndex] : null;
  const handoffActive = handoffStartRect != null;

  const goToSpecies = useCallback(
    (index) => {
      setSelectedId(collection[wrapIndex(index, collection.length)].id);
    },
    [collection],
  );

  const handleSelectPlankton = useCallback((id) => {
    setGalleryRestoreId(id);
    setSelectedId(id);
  }, []);

  const handleBackFromDetail = useCallback(() => {
    setSelectedId(null);
    setGalleryGpuEpoch((epoch) => epoch + 1);
  }, []);

  const finishReturnHome = useCallback(() => {
    setScanResultOpen(false);
    setScanExiting(false);
    setHandoffStartRect(null);
    setHandoffLanding(false);
    window.setTimeout(() => setGalleryFocusId(null), 400);
  }, []);

  const handleDockReady = useCallback(() => {
    if (!handoffLanding) return;
    setSpecimenDocked(true);
    finishReturnHome();
  }, [handoffLanding, finishReturnHome]);

  const handleHandoffComplete = useCallback(() => {
    setHandoffStartRect(null);
    setHandoffLanding(true);
  }, []);

  const handleAddScanSpecimen = useCallback(
    (startRect) => {
      if (scanExiting || !startRect) return;

      setHandoffLanding(false);
      setScanAdded(true);
      setGalleryFocusId(scanSpecimen.id);
      setHandoffStartRect(startRect);
      setScanExiting(true);
      setScanPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    },
    [scanExiting],
  );

  const handleScanPhaseChange = useCallback((phase) => {
    setScanProcessing(phase === "processing");
  }, []);

  const handleScanComplete = useCallback((previewUrl) => {
    setGalleryGpuEpoch((epoch) => epoch + 1);
    setScanPreview(previewUrl);
    setScanResultOpen(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        preloadSplineViewerAssets(scanSpecimen.splineViewer, scanSpecimen.splineUrl);
      });
    });
  }, []);

  const handleCloseScanResult = useCallback(() => {
    if (scanExiting) return;

    setScanPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setScanResultOpen(false);
  }, [scanExiting]);

  const showGallery = true;
  const detailOpen = Boolean(selectedPlankton && !scanResultOpen);
  const galleryConcealed = scanResultOpen && !scanExiting;
  const showHandoffLayer = scanResultOpen || (specimenDocked && !selectedPlankton);
  const galleryFocusPlanktonId = galleryFocusId ?? galleryRestoreId;

  const scanFlowActive = scanResultOpen || handoffActive || handoffLanding;
  const galleryGpuReleased = scanFlowActive;

  useEffect(() => {
    if (!showGallery || galleryFocusId || !galleryRestoreId) return undefined;

    const frame = requestAnimationFrame(() => {
      setGalleryRestoreId(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [showGallery, galleryFocusId, galleryRestoreId]);

  return (
    <div className="app-stage">
      <HomeScreen
          collection={collection}
          onSelect={handleSelectPlankton}
          onScanComplete={handleScanComplete}
          onScanPanelChange={setScanPanelOpen}
          onScanPhaseChange={handleScanPhaseChange}
          focusPlanktonId={galleryFocusPlanktonId}
          handoffActive={handoffActive || handoffLanding}
          galleryDockRef={galleryDockRef}
          specimenDocked={specimenDocked}
          concealed={galleryConcealed}
          behind={detailOpen}
          scanPanelOpen={scanPanelOpen}
          scanFlowActive={scanFlowActive}
          scanProcessing={scanProcessing}
          galleryGpuReleased={galleryGpuReleased}
          galleryGpuEpoch={galleryGpuEpoch}
        />

      {scanResultOpen ? (
        <ScanScreen
          uploadPreview={scanPreview}
          onClose={handleCloseScanResult}
          onAddToCollection={handleAddScanSpecimen}
          isInCollection={scanAdded}
          handoffInFlight={handoffActive || handoffLanding}
          scanStageRef={scanStageRef}
          handoffShellRef={handoffShellRef}
        />
      ) : null}

      {showHandoffLayer ? (
        <HandoffSpecimenLayer
          scanStageRef={scanStageRef}
          handoffShellRef={handoffShellRef}
          galleryDockRef={galleryDockRef}
          handoffActive={handoffActive}
          handoffLanding={handoffLanding}
          handoffStartRect={handoffStartRect}
          specimenDocked={specimenDocked}
          scanOpen={scanResultOpen}
          onHandoffComplete={handleHandoffComplete}
          onDockReady={handleDockReady}
        />
      ) : null}

      {selectedPlankton && !scanResultOpen ? (
        <DetailScreen
          plankton={selectedPlankton}
          speciesIndex={selectedIndex}
          collectionLength={collection.length}
          onBack={handleBackFromDetail}
          onPrev={() => goToSpecies(selectedIndex - 1)}
          onNext={() => goToSpecies(selectedIndex + 1)}
        />
      ) : null}
    </div>
  );
}
