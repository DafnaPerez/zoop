import { Suspense, useRef } from "react";
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
  loadModel = true,
  resizeFrozen = false,
  splineEnabled = true,
}) {
  const wasLoadedRef = useRef(false);
  if (loadModel) wasLoadedRef.current = true;

  const showModel = wasLoadedRef.current;
  const mountSpline = showModel && splineEnabled;

  const isSpline = plankton.viewer === "spline";
  const splineZoomScale = getPlanktonSplineZoomScale(plankton, { context: "gallery" });
  const ringDistance = Math.abs(offset);
  const floatPhase = ringDistance * 0.9;
  const classes = [
    "plankton-visual",
    float && isSpline && mountSpline ? "plankton-visual--float" : "",
    !mountSpline && isSpline && showModel ? "plankton-visual--placeholder" : "",
    !showModel && isSpline ? "plankton-visual--placeholder" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!showModel) {
    return <div className={classes} aria-hidden="true" />;
  }

  return (
    <div
      className={classes}
      style={
        float && isSpline && mountSpline
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
          loading="lazy"
          resizeFrozen={resizeFrozen}
          enabled={mountSpline}
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
