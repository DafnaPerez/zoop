import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import PlanktonScene from "./PlanktonScene";
import SplinePlanktonViewer from "./SplinePlanktonViewer";
import { getPlanktonSplineZoomScale } from "../utils/planktonSplineZoom";

export default function PlanktonSearchThumb({ plankton }) {
  if (plankton.viewer === "spline") {
    return (
      <div
        className="gallery-search-result-thumb gallery-search-result-thumb--spline"
        aria-hidden="true"
      >
        <div
          className="gallery-search-result-thumb-spline-stage"
          style={{
            "--spline-thumb-scale": plankton.searchThumbScale ?? 0.075,
          }}
        >
          <SplinePlanktonViewer
            url={plankton.splineUrl}
            viewerSrc={plankton.splineViewer}
            className="gallery-search-result-thumb-spline"
            previewSize={{ width: 480, height: 628 }}
            zoomScale={getPlanktonSplineZoomScale(plankton, { context: "search" })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-search-result-thumb" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        dpr={[1, 1]}
      >
        <Suspense fallback={null}>
          <PlanktonScene
            modelPath={plankton.model}
            scale={1.15}
            hoverAmplitude={0}
            rotationSpeed={0}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
