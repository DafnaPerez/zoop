import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { planktons } from "./data/planktons";
import { scanSpecimen } from "./data/scanSpecimen";
import { usePreventBrowserZoom } from "./hooks/usePreventBrowserZoom";
import { preloadSplineViewerAssets } from "./components/SplinePlanktonViewer";
import CollectionHandoffLayer from "./components/CollectionHandoffLayer";
import HandoffSpecimenLayer from "./components/HandoffSpecimenLayer";
import HomeScreen from "./screens/HomeScreen";
import CompareScreen from "./screens/CompareScreen";
import DetailScreen from "./screens/DetailScreen";
import ScanScreen from "./screens/ScanScreen";
import "./style.css";

const GALLERY_FOCUS_CLEAR_MS = 500;

function wrapIndex(index, length) {
  return ((index % length) + length) % length;
}

export default function App() {
  usePreventBrowserZoom();
  const scanStageRef = useRef(null);
  const handoffShellRef = useRef(null);
  const gallerySpecimenTargetRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [scanAdded, setScanAdded] = useState(false);
  const [scanPreview, setScanPreview] = useState(null);
  const [scanResultOpen, setScanResultOpen] = useState(false);
  const [collectionHandoff, setCollectionHandoff] = useState(false);
  const [handoffStartSpecimenRect, setHandoffStartSpecimenRect] = useState(null);
  const [galleryFocusId, setGalleryFocusId] = useState(null);
  const [galleryRestoreId, setGalleryRestoreId] = useState(null);
  const [compareId, setCompareId] = useState(null);

  const collection = useMemo(
    () => (scanAdded ? [...planktons, scanSpecimen] : planktons),
    [scanAdded],
  );

  const selectedIndex = collection.findIndex((entry) => entry.id === selectedId);
  const selectedPlankton = selectedIndex >= 0 ? collection[selectedIndex] : null;

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
    setCompareId(null);
  }, []);

  const handleCompareSelect = useCallback((id) => {
    setCompareId(id);
  }, []);

  const handleBackFromCompare = useCallback(() => {
    setCompareId(null);
  }, []);

  const handleAddScanSpecimen = useCallback(() => {
    if (collectionHandoff || scanAdded) return;

    const specimenNode = handoffShellRef.current ?? scanStageRef.current;
    if (!specimenNode) return;

    setHandoffStartSpecimenRect(specimenNode.getBoundingClientRect());
    setScanAdded(true);
    setGalleryFocusId(scanSpecimen.id);
    setCollectionHandoff(true);
    setScanPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, [collectionHandoff, scanAdded]);

  const handleCollectionHandoffComplete = useCallback(() => {
    setCollectionHandoff(false);
    setHandoffStartSpecimenRect(null);
    setScanResultOpen(false);
    window.setTimeout(() => setGalleryFocusId(null), GALLERY_FOCUS_CLEAR_MS);
  }, []);

  const handleScanComplete = useCallback((previewUrl) => {
    setScanPreview(previewUrl);
    setScanResultOpen(true);
    window.requestAnimationFrame(() => {
      preloadSplineViewerAssets(scanSpecimen.splineViewer, scanSpecimen.splineUrl);
    });
  }, []);

  const handleCloseScanResult = useCallback(() => {
    if (collectionHandoff) return;

    setScanPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setScanResultOpen(false);
  }, [collectionHandoff]);

  const comparePlankton = compareId
    ? collection.find((entry) => entry.id === compareId) ?? null
    : null;
  const compareOpen = Boolean(
    selectedPlankton && comparePlankton && !scanResultOpen && !collectionHandoff,
  );
  const detailOpen = Boolean(
    selectedPlankton && !compareOpen && !scanResultOpen && !collectionHandoff,
  );
  const galleryConcealed = scanResultOpen && !collectionHandoff;
  const galleryFocusPlanktonId = galleryFocusId ?? galleryRestoreId;

  useEffect(() => {
    if (galleryFocusId || !galleryRestoreId) return undefined;

    const frame = requestAnimationFrame(() => {
      setGalleryRestoreId(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [galleryFocusId, galleryRestoreId]);

  useEffect(() => {
    if (!compareOpen || !comparePlankton || !selectedPlankton) return;

    [selectedPlankton, comparePlankton].forEach((plankton) => {
      if (plankton.viewer !== "spline") return;
      preloadSplineViewerAssets(plankton.splineViewer, plankton.splineUrl);
    });
  }, [compareOpen, comparePlankton, selectedPlankton]);

  return (
    <div className="app-stage">
      <HomeScreen
        collection={collection}
        onSelect={handleSelectPlankton}
        onScanComplete={handleScanComplete}
        onScanPanelChange={undefined}
        focusPlanktonId={galleryFocusPlanktonId}
        concealed={galleryConcealed}
        collectionHandoff={collectionHandoff}
        gallerySpecimenTargetRef={gallerySpecimenTargetRef}
        behind={detailOpen || compareOpen}
      />

      {scanResultOpen ? (
        <ScanScreen
          uploadPreview={scanPreview}
          onClose={handleCloseScanResult}
          onAddToCollection={handleAddScanSpecimen}
          isInCollection={scanAdded}
          handoffActive={collectionHandoff}
          scanStageRef={scanStageRef}
          handoffShellRef={handoffShellRef}
        />
      ) : null}

      {scanResultOpen ? (
        <HandoffSpecimenLayer
          scanStageRef={scanStageRef}
          handoffShellRef={handoffShellRef}
          scanOpen={scanResultOpen}
          detailOpen={detailOpen}
          collectionHandoff={collectionHandoff}
        />
      ) : null}

      {collectionHandoff ? (
        <CollectionHandoffLayer
          active={collectionHandoff}
          startSpecimenRect={handoffStartSpecimenRect}
          specimenTargetRef={gallerySpecimenTargetRef}
          onComplete={handleCollectionHandoffComplete}
        />
      ) : null}

      {compareOpen ? (
        <CompareScreen
          leftPlankton={selectedPlankton}
          rightPlankton={comparePlankton}
          onBack={handleBackFromCompare}
        />
      ) : null}

      {detailOpen ? (
        <DetailScreen
          plankton={selectedPlankton}
          collection={collection}
          speciesIndex={selectedIndex}
          collectionLength={collection.length}
          onBack={handleBackFromDetail}
          onPrev={() => goToSpecies(selectedIndex - 1)}
          onNext={() => goToSpecies(selectedIndex + 1)}
          onCompare={handleCompareSelect}
        />
      ) : null}
    </div>
  );
}
