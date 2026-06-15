import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import PlanktonScene from "./PlanktonScene";
import SplinePlanktonViewer from "./SplinePlanktonViewer";

export default function PlanktonCard({ plankton, index, style, onSelect }) {
  const isSpline = plankton.viewer === "spline";

  return (
    <button
      type="button"
      className="plankton-card"
      style={style}
      onClick={() => onSelect(plankton.id)}
      aria-label={plankton.name}
    >
      <div className="plankton-card-canvas">
        {isSpline ? (
          <SplinePlanktonViewer
            url={plankton.splineUrl}
            viewerSrc={plankton.splineViewer}
            className="plankton-spline-viewer"
          />
        ) : (
          <Canvas
            camera={{ position: [0, 0, 4], fov: 42 }}
            gl={{ alpha: true, antialias: true }}
            onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
            dpr={[1, 1.5]}
          >
            <Suspense fallback={null}>
              <PlanktonScene
                modelPath={plankton.model}
                scale={1.5}
                hoverAmplitude={0.2}
                rotationSpeed={0.004}
                phaseOffset={index * 0.7}
              />
            </Suspense>
          </Canvas>
        )}
      </div>

      <span className="plankton-card-label">{plankton.name}</span>
    </button>
  );
}
