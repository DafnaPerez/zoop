import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { planktons } from "./data/planktons";
import { scanSpecimen } from "./data/scanSpecimen";
import { usePreventBrowserZoom } from "./hooks/usePreventBrowserZoom";
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

  const handleScanComplete = useCallback((previewUrl) => {
    setScanPreview(previewUrl);
    setScanResultOpen(true);
  }, []);

  const handleCloseScanResult = useCallback(() => {
    if (scanExiting) return;

    setScanPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setScanResultOpen(false);
  }, [scanExiting]);

  const showGallery = !selectedPlankton;
  const galleryConcealed = scanResultOpen && !scanExiting;
  const showHandoffLayer = scanResultOpen || (specimenDocked && !selectedPlankton);

  return (
    <div className="app-stage">
      {showGallery ? (
        <HomeScreen
          collection={collection}
          onSelect={setSelectedId}
          onScanComplete={handleScanComplete}
          focusPlanktonId={galleryFocusId}
          handoffActive={handoffActive || handoffLanding}
          galleryDockRef={galleryDockRef}
          specimenDocked={specimenDocked}
          concealed={galleryConcealed}
        />
      ) : null}

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
          onBack={() => setSelectedId(null)}
          onPrev={() => goToSpecies(selectedIndex - 1)}
          onNext={() => goToSpecies(selectedIndex + 1)}
        />
      ) : null}
    </div>
  );
}
