import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { planktons } from "./data/planktons";
import { scanSpecimen, SCAN_PROCESSING_MS } from "./data/scanSpecimen";
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
  const rescanTimerRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [scanAdded, setScanAdded] = useState(false);
  const [scanPreview, setScanPreview] = useState(null);
  const [scanResultOpen, setScanResultOpen] = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [scanPanelOpen, setScanPanelOpen] = useState(false);
  const [collectionHandoff, setCollectionHandoff] = useState(false);
  const [handoffStartSpecimenRect, setHandoffStartSpecimenRect] = useState(null);
  const [galleryFocusId, setGalleryFocusId] = useState(null);
  const [galleryRestoreId, setGalleryRestoreId] = useState(null);
  const [compareId, setCompareId] = useState(null);

  useEffect(() => {
    return () => {
      if (rescanTimerRef.current) {
        window.clearTimeout(rescanTimerRef.current);
      }
    };
  }, []);

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
    setScanPanelOpen(false);
    window.setTimeout(() => setGalleryFocusId(null), GALLERY_FOCUS_CLEAR_MS);
  }, []);

  const handleScanComplete = useCallback((previewUrl) => {
    setScanPanelOpen(false);
    setScanPreview(previewUrl);
    setScanResultOpen(true);
    window.requestAnimationFrame(() => {
      preloadSplineViewerAssets(scanSpecimen.splineViewer, scanSpecimen.splineUrl);
    });
  }, []);

  const handleCloseScanResult = useCallback(() => {
    if (collectionHandoff || scanProcessing) return;

    if (rescanTimerRef.current) {
      window.clearTimeout(rescanTimerRef.current);
      rescanTimerRef.current = null;
    }

    setScanPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setScanResultOpen(false);
    setScanProcessing(false);
    setScanPanelOpen(false);
  }, [collectionHandoff, scanProcessing]);

  const handleRescanFile = useCallback((file) => {
    if (collectionHandoff || scanProcessing) return;
    if (!file?.type.startsWith("image/")) return;

    if (rescanTimerRef.current) {
      window.clearTimeout(rescanTimerRef.current);
      rescanTimerRef.current = null;
    }

    setScanPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });

    const previewUrl = URL.createObjectURL(file);
    setScanPreview(previewUrl);
    setScanProcessing(true);
    preloadSplineViewerAssets(scanSpecimen.splineViewer, scanSpecimen.splineUrl);

    rescanTimerRef.current = window.setTimeout(() => {
      rescanTimerRef.current = null;
      setScanProcessing(false);
    }, SCAN_PROCESSING_MS);
  }, [collectionHandoff, scanProcessing]);

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
        scanPanelOpen={scanPanelOpen}
        onScanPanelOpenChange={setScanPanelOpen}
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
          onRescanFile={handleRescanFile}
          scanProcessing={scanProcessing}
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
          collection={collection}
          onBack={handleBackFromCompare}
          onChangePrimary={setSelectedId}
          onChangeComparison={setCompareId}
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
