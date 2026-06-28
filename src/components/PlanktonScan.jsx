import { useEffect, useRef, useState } from "react";
import { preloadSplineViewerAssets } from "./SplinePlanktonViewer";
import { scanSpecimen, SCAN_PROCESSING_MS } from "../data/scanSpecimen";

function ScanToggleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9V6h3M18 9V6h-3M6 15v3h3M18 15v3h-3"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="square"
      />
      <path
        d="M8.5 12h7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" />
    </svg>
  );
}

export default function PlanktonScan({
  onScanComplete,
  onExpandedChange,
  onScanPhaseChange,
  expanded: expandedProp,
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const processingTimerRef = useRef(null);
  const previewUrlRef = useRef(null);
  const [expandedInternal, setExpandedInternal] = useState(false);
  const isControlled = expandedProp !== undefined;
  const expanded = isControlled ? expandedProp : expandedInternal;
  const [phase, setPhase] = useState("idle");
  const [uploadPreview, setUploadPreview] = useState(null);

  const setExpanded = (next) => {
    if (!isControlled) {
      setExpandedInternal(next);
    }
    onExpandedChange?.(next);
  };

  useEffect(() => {
    return () => {
      if (processingTimerRef.current) {
        window.clearTimeout(processingTimerRef.current);
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") closePanel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        closePanel();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded]);

  const clearProcessingTimer = () => {
    if (processingTimerRef.current) {
      window.clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
  };

  const clearPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setUploadPreview(null);
  };

  const resetUpload = () => {
    clearProcessingTimer();
    clearPreview();
    onScanPhaseChange?.("idle");
    setPhase("idle");
  };

  const closePanel = () => {
    resetUpload();
    setExpanded(false);
  };

  const togglePanel = () => {
    if (expanded) {
      closePanel();
      return;
    }

    setExpanded(true);
  };

  const processFile = (file) => {
    if (!file?.type.startsWith("image/")) return;

    resetUpload();

    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setUploadPreview(previewUrl);
    setPhase("processing");
    onScanPhaseChange?.("processing");
    preloadSplineViewerAssets(scanSpecimen.splineViewer, scanSpecimen.splineUrl);

    processingTimerRef.current = window.setTimeout(() => {
      processingTimerRef.current = null;
      const completedUrl = previewUrlRef.current;
      previewUrlRef.current = null;
      onScanPhaseChange?.("idle");
      onScanComplete(completedUrl);
      setUploadPreview(null);
      setPhase("idle");
      setExpanded(false);
    }, SCAN_PROCESSING_MS);
  };

  const onFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    event.target.value = "";
  };

  const onDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div
      className={`gallery-scan${expanded ? " gallery-scan--expanded" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className="gallery-scan-toggle gallery-nav-btn"
        onClick={togglePanel}
        aria-label="Add plankton scan"
        aria-expanded={expanded}
        aria-haspopup="dialog"
      >
        <span className="gallery-scan-toggle-icon" aria-hidden="true">
          <ScanToggleIcon />
        </span>
      </button>

      {expanded ? (
        <div
          className="gallery-scan-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Add plankton scan"
        >
          <p className="gallery-scan-panel-title">Add plankton scan</p>

          {phase === "idle" ? (
            <>
              <button
                type="button"
                className="scan-dropzone"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={onDrop}
              >
                <span className="gallery-scan-dropzone-icon" aria-hidden="true">
                  <ScanToggleIcon />
                </span>
                <span className="scan-dropzone-title">Upload scan image</span>
                <span className="scan-dropzone-hint">
                  Drop a photo here or click to browse
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="scan-file-input"
                onChange={onFileChange}
              />
            </>
          ) : null}

          {phase === "processing" ? (
            <div className="scan-processing-stage">
              {uploadPreview ? (
                <img
                  src={uploadPreview}
                  alt="Uploaded scan preview"
                  className="scan-upload-preview"
                />
              ) : null}
              <p className="scan-processing-label">Analyzing scan…</p>
              <div className="scan-processing-bar" aria-hidden="true">
                <span className="scan-processing-bar-fill" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
