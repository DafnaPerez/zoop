import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { BlueprintFrame, BlueprintScaffold } from "../components/BlueprintScaffold";
import DetailSpecimenScale from "../components/DetailSpecimenScale";
import PlanktonModel from "../components/PlanktonModel";
import SplinePlanktonViewer from "../components/SplinePlanktonViewer";
import { getPlanktonSplineZoomScale } from "../utils/planktonSplineZoom";

function getSketchSlots(plankton) {
  return (plankton.sketches ?? []).map((image, index) => ({
    image,
    imageAlign: index === 0 ? "right" : "left",
    alt: `${plankton.name} sketch ${index + 1}`,
  }));
}

const DETAIL_MODEL_SCALE = 1.75 * 0.7;

export default function DetailScreen({
  plankton,
  speciesIndex,
  collectionLength,
  onBack,
  onPrev,
  onNext,
}) {
  const isSpline = plankton.viewer === "spline";

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onBack();
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack, onPrev, onNext]);

  return (
    <main className="detail-screen">
      <BlueprintScaffold />
      <div className="detail-grain" aria-hidden="true" />
      <div className="gallery-glow gallery-glow-primary" aria-hidden="true" />
      <div className="gallery-glow gallery-glow-secondary" aria-hidden="true" />
      <div className="detail-ambient-glow" aria-hidden="true" />

      <div className="detail-layout">
        <aside className="detail-sidebar detail-sidebar--left detail-reveal detail-reveal--1">
          <button type="button" className="detail-back-btn" onClick={onBack}>
            ← Back
          </button>

          <div className="detail-panel">
            <div className="detail-panel-header">
              <p className="gallery-eyebrow detail-eyebrow">Plankton Atlas</p>
              <span className="detail-index">
                {String(speciesIndex + 1).padStart(2, "0")} /{" "}
                {String(collectionLength).padStart(2, "0")}
              </span>
            </div>

            <h1 className="detail-species-name">{plankton.name}</h1>
            <p className="detail-species-taxonomy">{plankton.taxonomy}</p>

            <div className="detail-stats">
              <div className="detail-stat">
                <span className="detail-info-label">
                  {plankton.habitat ? "Habitat" : "Depth"}
                </span>
                <p>{plankton.habitat ?? plankton.depth}</p>
              </div>
              <div className="detail-stat">
                <span className="detail-info-label">Size</span>
                <p>{plankton.size}</p>
              </div>
            </div>

            {(plankton.detailSections ??
              (plankton.description
                ? [{ label: "Notes", text: plankton.description }]
                : [])
            ).map((section, index) => (
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
          </div>
        </aside>

        <section
          className="detail-model-area detail-reveal detail-reveal--2"
          aria-label={`3D model of ${plankton.name}`}
        >
          <div className="detail-model-stage">
            <BlueprintFrame label="LIVE SPECIMEN" />
            <div className="detail-model-glow" aria-hidden="true" />

            <div className="detail-model-float">
              <div
                className="detail-model-viewport"
                style={
                  plankton.detailOffsetX != null || plankton.detailOffsetY != null
                    ? {
                        transform: `translate(${plankton.detailOffsetX ?? 0}px, ${plankton.detailOffsetY ?? 0}px)`,
                      }
                    : undefined
                }
              >
              {isSpline ? (
                <SplinePlanktonViewer
                  key={plankton.id}
                  url={plankton.splineUrl}
                  viewerSrc={plankton.splineViewer}
                  className="detail-spline-viewer"
                  zoomScale={getPlanktonSplineZoomScale(plankton)}
                  limitZoom
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

          <p className="detail-model-hint">Drag to rotate · Pinch to zoom</p>
        </section>

        <aside className="detail-sidebar detail-sidebar--right detail-reveal detail-reveal--3">
          <div className="detail-sketch-stack">
            {getSketchSlots(plankton).map((slot) => (
              <div
                key={slot.image}
                className="detail-media-card detail-media-card--large detail-media-card--image"
              >
                <img
                  src={slot.image}
                  alt={slot.alt}
                  className={`detail-media-card-image detail-media-card-image--${slot.imageAlign}`}
                />
              </div>
            ))}
          </div>

          {plankton.scaleMaxMm ? (
            <DetailSpecimenScale maxMm={plankton.scaleMaxMm} />
          ) : null}
        </aside>
      </div>

      <footer className="detail-footer">
        <div className="gallery-controls">
          <button
            type="button"
            className="gallery-nav-btn"
            onClick={onPrev}
            aria-label="Previous species"
          >
            ←
          </button>
          <span className="gallery-counter">
            {String(speciesIndex + 1).padStart(2, "0")} /{" "}
            {String(collectionLength).padStart(2, "0")}
          </span>
          <button
            type="button"
            className="gallery-nav-btn"
            onClick={onNext}
            aria-label="Next species"
          >
            →
          </button>
        </div>
      </footer>
    </main>
  );
}
