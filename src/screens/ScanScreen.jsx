import { useEffect, useState } from "react";
import { BlueprintScaffold } from "../components/BlueprintScaffold";
import { SCAN_ACCURACY, scanSpecimen } from "../data/scanSpecimen";

const CHROME_DELAY_MS = 6200;
const INTRO_MS = 7000;

export default function ScanScreen({
  uploadPreview,
  onClose,
  onAddToCollection,
  isInCollection,
  handoffInFlight = false,
  scanStageRef,
  handoffShellRef,
}) {
  const [accuracyFill, setAccuracyFill] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const fallback = window.setTimeout(() => setIntroComplete(true), INTRO_MS + 100);
    return () => window.clearTimeout(fallback);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !handoffInFlight) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, handoffInFlight]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => setAccuracyFill(SCAN_ACCURACY));
    }, CHROME_DELAY_MS + 120);

    return () => window.clearTimeout(timer);
  }, []);

  const handleAdd = () => {
    const rect = handoffShellRef?.current?.getBoundingClientRect();
    if (rect?.width) onAddToCollection(rect);
  };

  return (
    <div
      className={`scan-screen${introComplete ? " scan-screen--intro-complete" : ""}${handoffInFlight ? " scan-screen--handoff" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Plankton scan"
    >
      <BlueprintScaffold />
      <div className="gallery-glow gallery-glow-primary scan-intro-chrome" aria-hidden="true" />
      <div className="gallery-glow gallery-glow-secondary scan-intro-chrome" aria-hidden="true" />

      <header className="scan-header scan-intro-chrome">
        <button type="button" className="detail-back-btn" onClick={onClose} disabled={handoffInFlight}>
          ← Back
        </button>
        <p className="gallery-eyebrow scan-eyebrow">Plankton Atlas</p>
        <h2 className="scan-title">Specimen scan</h2>
      </header>

      <div className="scan-result-layout">
        <aside className="scan-result-panel scan-intro-chrome">
          <div className="detail-panel scan-result-info">
            <p className="gallery-eyebrow detail-eyebrow">Match found</p>
            <h1 className="detail-species-name">{scanSpecimen.name}</h1>
            <p className="detail-species-taxonomy">{scanSpecimen.taxonomy}</p>

            <div className="scan-accuracy">
              <div className="scan-accuracy-meta">
                <span className="detail-info-label">Accuracy</span>
                <span className="scan-accuracy-value">{SCAN_ACCURACY}%</span>
              </div>
              <div
                className="scan-accuracy-track"
                role="progressbar"
                aria-valuenow={SCAN_ACCURACY}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Identification accuracy"
              >
                <span
                  className="scan-accuracy-fill"
                  style={{ width: `${accuracyFill}%` }}
                />
              </div>
            </div>

            <div className="detail-stats">
              <div className="detail-stat">
                <span className="detail-info-label">Habitat</span>
                <p>{scanSpecimen.habitat}</p>
              </div>
              <div className="detail-stat">
                <span className="detail-info-label">Size</span>
                <p>{scanSpecimen.size}</p>
              </div>
            </div>

            {scanSpecimen.detailSections.map((section, index) => (
              <div
                key={section.label}
                className={`detail-info-block${
                  index === 0 ? " detail-info-block--description" : ""
                }`}
              >
                <span className="detail-info-label">{section.label}</span>
                <p>{section.text}</p>
              </div>
            ))}

            {uploadPreview ? (
              <figure className="scan-source-panel">
                <figcaption>Source scan</figcaption>
                <img src={uploadPreview} alt="Source scan" />
              </figure>
            ) : null}
          </div>
        </aside>

        <section className="scan-result-model">
          <div ref={scanStageRef} className="scan-result-model-stage">
            <div className="detail-model-glow scan-intro-chrome" aria-hidden="true" />
          </div>
        </section>
      </div>

      <footer className="scan-footer scan-intro-chrome">
        <button
          type="button"
          className="scan-rescan-btn atlas-btn"
          onClick={onClose}
          disabled={handoffInFlight}
        >
          Scan another
        </button>
        <button
          type="button"
          className="scan-add-btn atlas-btn"
          onClick={handleAdd}
          disabled={isInCollection || handoffInFlight}
        >
          {isInCollection ? "Added to collection" : "Add to collection →"}
        </button>
      </footer>
    </div>
  );
}
