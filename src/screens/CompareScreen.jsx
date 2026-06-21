import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { BlueprintFrame, BlueprintScaffold } from "../components/BlueprintScaffold";
import PlanktonModel from "../components/PlanktonModel";
import { buildComparisonSummary } from "../utils/planktonComparison";
import { getCompareSpecimenIframeSrc } from "../utils/compareSpecimenIframe";

const DETAIL_MODEL_SCALE = 1.75 * 0.7;

function CompareSpecimenColumn({ plankton, side }) {
  const isSpline = plankton.viewer === "spline";

  return (
    <article className={`compare-specimen compare-specimen--${side}`}>
      <div className="compare-specimen-header">
        <p className="gallery-eyebrow compare-specimen-eyebrow">
          {side === "left" ? "Primary" : "Comparison"}
        </p>
        <h2 className="compare-specimen-name">{plankton.name}</h2>
        <p className="compare-specimen-taxonomy">{plankton.taxonomy}</p>
      </div>

      <div
        className="compare-specimen-stage"
        aria-label={`Specimen view of ${plankton.name}`}
      >
        <BlueprintFrame label="LIVE SPECIMEN" />
        <div className="detail-model-glow" aria-hidden="true" />

        <div className="detail-model-float">
          <div className="detail-model-viewport">
            {isSpline ? (
              <iframe
                key={plankton.id}
                title={`3D model of ${plankton.name}`}
                className="compare-specimen-iframe"
                src={getCompareSpecimenIframeSrc(plankton)}
                loading="eager"
                tabIndex={-1}
              />
            ) : (
              <Canvas
                key={plankton.id}
                camera={{ position: [0, 0, 5], fov: 45 }}
                gl={{ alpha: true, antialias: true }}
                onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
              >
                <Suspense fallback={null}>
                  <PlanktonModel
                    modelPath={plankton.model}
                    scale={DETAIL_MODEL_SCALE}
                    hoverAmplitude={0}
                    rotationSpeed={0}
                  />
                </Suspense>
              </Canvas>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CompareScreen({ leftPlankton, rightPlankton, onBack }) {
  const rows = buildComparisonSummary(leftPlankton, rightPlankton);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onBack();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  return (
    <main className="compare-screen">
      <BlueprintScaffold />
      <div className="detail-grain" aria-hidden="true" />
      <div className="gallery-glow gallery-glow-primary" aria-hidden="true" />
      <div className="gallery-glow gallery-glow-secondary" aria-hidden="true" />
      <div className="detail-ambient-glow" aria-hidden="true" />

      <div className="compare-layout">
        <header className="compare-header detail-reveal detail-reveal--1">
          <button type="button" className="detail-back-btn compare-back-btn" onClick={onBack}>
            ← Back to {leftPlankton.name}
          </button>
          <div className="compare-header-copy">
            <p className="gallery-eyebrow detail-eyebrow">Plankton Atlas</p>
            <h1 className="compare-title">Species comparison</h1>
          </div>
        </header>

        <div className="compare-models">
          <CompareSpecimenColumn plankton={leftPlankton} side="left" />
          <CompareSpecimenColumn plankton={rightPlankton} side="right" />
        </div>

        <section
          className="compare-summary detail-reveal detail-reveal--3"
          aria-label="Comparison details"
        >
          {rows.map((row) => (
            <div key={row.label} className="compare-summary-row">
              <p className="compare-summary-label">{row.label}</p>
              <div className="compare-summary-values">
                <p className="compare-summary-value">{row.left}</p>
                <p className="compare-summary-value">{row.right}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
