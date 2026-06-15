import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import PlanktonScene from "./PlanktonScene";
import SplinePlanktonViewer from "./SplinePlanktonViewer";
import { getPlanktonSplineZoomScale } from "../utils/planktonSplineZoom";

export default function PlanktonVisual({
  plankton,
  index = 0,
  offset = 0,
  isCenter = false,
  className = "",
  onSceneReady = null,
  float = false,
}) {
  const isSpline = plankton.viewer === "spline";
  const splineZoomScale = getPlanktonSplineZoomScale(plankton, { context: "gallery" });
  const ringDistance = Math.abs(offset);
  const floatPhase = ringDistance * 0.9;
  const classes = [
    "plankton-visual",
    float && isSpline ? "plankton-visual--float" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={
        float && isSpline
          ? { animationDelay: `${floatPhase}s` }
          : undefined
      }
    >
      {isSpline ? (
        <SplinePlanktonViewer
          url={plankton.splineUrl}
          viewerSrc={plankton.splineViewer}
          className="plankton-spline-viewer"
          zoomScale={splineZoomScale}
          notifyWhenFramed={Boolean(onSceneReady)}
          onSceneReady={onSceneReady}
        />
      ) : (
        <Canvas
          camera={{ position: [0, 0, 4], fov: 42 }}
          gl={{ alpha: true, antialias: true }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
          dpr={[1, 1.25]}
        >
          <Suspense fallback={null}>
            <PlanktonScene
              modelPath={plankton.model}
              scale={isCenter ? 1.6 : 1.35}
              hoverAmplitude={ringDistance >= 2 ? 0 : 0.14}
              rotationSpeed={0}
              phaseOffset={floatPhase}
            />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
