import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SHARED_SPLINE_VIEWER } from "../utils/splineRuntime";

let viewerRuntimePromise = null;
const SPLINE_ZOOM_OUT_MIN_FACTOR = 1;
const SPLINE_ZOOM_IN_MAX_FACTOR = 3;
const ZOOM_WHEEL_SENSITIVITY = 1.05;
const ZOOM_SMOOTHING = 0.3;
const ZOOM_STOP_EPSILON = 0.0004;

export function preloadSplineViewerAssets(_viewerSrc, sceneUrl) {
  loadSplineViewerModule();
  if (sceneUrl) {
    fetch(sceneUrl).catch(() => {});
  }
}

function loadSplineViewerModule() {
  if (customElements.get("spline-viewer")) {
    return Promise.resolve();
  }

  if (viewerRuntimePromise) {
    return viewerRuntimePromise;
  }

  viewerRuntimePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = SHARED_SPLINE_VIEWER;
    script.onload = () => resolve();
    script.onerror = () => {
      viewerRuntimePromise = null;
      reject(new Error("Failed to load Spline viewer"));
    };
    document.head.appendChild(script);
  });

  return viewerRuntimePromise;
}

function hideSplineChrome(viewer) {
  const root = viewer.shadowRoot;
  if (!root) return;

  root.querySelector("#logo")?.style.setProperty("display", "none");
  root.querySelector("#hint-drag")?.style.setProperty("display", "none");
  root.querySelector("canvas")?.style.setProperty("background", "transparent");
  root.querySelector("canvas")?.style.setProperty("background-color", "transparent");
}

function hideSplineSceneBackground(spline) {
  spline?._scene?.traverseEntity?.((entity) => {
    const name = entity.name?.toLowerCase?.() ?? "";
    if (
      name === "rectangle" ||
      name.includes("background") ||
      name.endsWith("_bg") ||
      name === "bg"
    ) {
      entity.visible = false;
    }
  });
  spline?.setBackgroundColor?.("transparent");
}

function getMeshBounds(spline) {
  let meshEntity = null;
  let largestFallback = null;
  let largestVolume = 0;

  spline._scene?.traverseEntity?.((entity) => {
    const verts = entity.singleBBox?.vertices;
    if (!verts?.length) return;

    const xs = verts.map((v) => v.x);
    const ys = verts.map((v) => v.y);
    const zs = verts.map((v) => v.z);
    const size = {
      x: Math.max(...xs) - Math.min(...xs),
      y: Math.max(...ys) - Math.min(...ys),
      z: Math.max(...zs) - Math.min(...zs),
    };
    const bounds = {
      center: {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
        z: (Math.min(...zs) + Math.max(...zs)) / 2,
      },
      size,
    };

    if (entity.name === "mesh_node") {
      meshEntity = bounds;
      return;
    }

    const volume = size.x * size.y * size.z;
    if (volume > largestVolume) {
      largestVolume = volume;
      largestFallback = bounds;
    }
  });

  const chosen = meshEntity ?? largestFallback;
  if (!chosen) return null;

  return chosen;
}

function resizeSplineViewer(viewer) {
  const spline = viewer._spline;
  const container = viewer.parentElement;
  if (!spline || !container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;
  if (!width || !height) return;

  spline._viewportWidth = width;
  spline._viewportHeight = height;

  if (spline._frameView) {
    spline._frameView.enableResponsive = true;
    if (spline._frameView.frameSize) {
      spline._frameView.frameSize.x = width;
      spline._frameView.frameSize.y = height;
    }
  }

  spline._resize?.(true);
  hideSplineSceneBackground(spline);
  spline.setBackgroundColor("transparent");
}

function getOrbitAzimuth(controls) {
  if (typeof controls.getAzimuthalAngle === "function") {
    return controls.getAzimuthalAngle();
  }

  const camera = controls?.object;
  const target = controls?.target;
  if (!camera || !target) return 0;

  const dx = camera.position.x - target.x;
  const dz = camera.position.z - target.z;
  return Math.atan2(dx, dz);
}

function setOrbitAzimuth(controls, azimuth) {
  if (typeof controls.setAzimuthalAngle === "function") {
    controls.setAzimuthalAngle(azimuth);
    controls.update?.();
    return;
  }

  const camera = controls?.object;
  const target = controls?.target;
  if (!camera || !target) return;

  const dx = camera.position.x - target.x;
  const dy = camera.position.y - target.y;
  const dz = camera.position.z - target.z;
  const radius = Math.hypot(dx, dy, dz) || 1;
  const polar = Math.acos(Math.max(-1, Math.min(1, dy / radius)));
  const horizontal = radius * Math.sin(polar);

  camera.position.set(
    target.x + horizontal * Math.sin(azimuth),
    target.y + radius * Math.cos(polar),
    target.z + horizontal * Math.cos(azimuth),
  );
  camera.lookAt(target);
  controls.update?.();
}

function stopIntroTurntable(viewer) {
  if (viewer._introTurntableFrame) {
    cancelAnimationFrame(viewer._introTurntableFrame);
    viewer._introTurntableFrame = null;
  }

  const controls = viewer._spline ? getOrbitControls(viewer._spline) : null;
  if (controls) {
    controls.enableRotate = viewer._introTurntablePrevEnableRotate ?? true;
    controls.autoRotate = viewer._introTurntablePrevAutoRotate ?? false;
  }
}

function lockSplineRotation(viewer) {
  if (viewer._introTurntableFrame) {
    cancelAnimationFrame(viewer._introTurntableFrame);
    viewer._introTurntableFrame = null;
  }

  const controls = viewer._spline ? getOrbitControls(viewer._spline) : null;
  if (!controls) return;

  if (!viewer._rotationLockSnapshot) {
    viewer._rotationLockSnapshot = {
      enableRotate: controls.enableRotate,
      autoRotate: controls.autoRotate,
    };
  }

  controls.enableRotate = false;
  controls.autoRotate = false;
}

function unlockSplineRotation(viewer) {
  stopRotationHold(viewer);

  const controls = viewer._spline ? getOrbitControls(viewer._spline) : null;
  const snapshot = viewer._rotationLockSnapshot;
  if (controls && snapshot) {
    controls.enableRotate = snapshot.enableRotate;
    controls.autoRotate = snapshot.autoRotate;
  }
  viewer._rotationLockSnapshot = null;
}

function startRotationHold(viewer) {
  lockSplineRotation(viewer);

  const controls = viewer._spline ? getOrbitControls(viewer._spline) : null;
  if (!controls || viewer._rotationHoldActive) return;

  viewer._rotationHoldAzimuth = getOrbitAzimuth(controls);
  viewer._rotationHoldActive = true;

  const hold = () => {
    if (!viewer._rotationHoldActive) {
      viewer._rotationHoldFrame = null;
      return;
    }

    const activeControls = viewer._spline ? getOrbitControls(viewer._spline) : null;
    if (activeControls) {
      activeControls.enableRotate = false;
      activeControls.autoRotate = false;
      setOrbitAzimuth(activeControls, viewer._rotationHoldAzimuth);
      viewer._spline?.requestRender?.();
    }

    viewer._rotationHoldFrame = requestAnimationFrame(hold);
  };

  viewer._rotationHoldFrame = requestAnimationFrame(hold);
}

function stopRotationHold(viewer) {
  viewer._rotationHoldActive = false;
  if (viewer._rotationHoldFrame) {
    cancelAnimationFrame(viewer._rotationHoldFrame);
    viewer._rotationHoldFrame = null;
  }
}

const INTRO_TURNTABLE_LAND_MS = 1150;

function introTurntableLandingEase(u) {
  return u + u * u - u * u * u;
}

function startIntroTurntable(viewer, controls, spline, { durationMs, rotations }) {
  if (!controls || !spline || viewer._introTurntableStarted) return;

  viewer._introTurntableStarted = true;
  viewer._introTurntablePrevEnableRotate = controls.enableRotate;
  viewer._introTurntablePrevAutoRotate = controls.autoRotate;

  const startAzimuth = getOrbitAzimuth(controls);
  const totalAngle = Math.PI * 2 * rotations;
  const easeOutDuration = Math.min(INTRO_TURNTABLE_LAND_MS, durationMs * 0.18);
  const linearDuration = durationMs - easeOutDuration;
  const angularVelocity = totalAngle / durationMs;
  const linearAngle = angularVelocity * linearDuration;
  const easeOutAngle = totalAngle - linearAngle;
  const startTime = performance.now();

  controls.autoRotate = false;
  controls.enableRotate = false;

  const step = (now) => {
    const elapsed = now - startTime;
    let angle;

    if (elapsed <= linearDuration) {
      angle = startAzimuth + angularVelocity * elapsed;
    } else {
      const u = Math.min(1, (elapsed - linearDuration) / easeOutDuration);
      angle = startAzimuth + linearAngle + easeOutAngle * introTurntableLandingEase(u);
    }

    setOrbitAzimuth(controls, angle);
    spline.requestRender?.();

    if (elapsed < durationMs) {
      viewer._introTurntableFrame = requestAnimationFrame(step);
      return;
    }

    viewer._introTurntableFrame = null;
    controls.enableRotate = viewer._introTurntablePrevEnableRotate ?? true;
    controls.autoRotate = viewer._introTurntablePrevAutoRotate ?? false;
  };

  viewer._introTurntableFrame = requestAnimationFrame(step);
}

function getOrbitControls(spline) {
  return spline?._controls?.orbitControls;
}

function applyOrbitZoomLimits(controls, limits) {
  if (!controls || !limits) return;

  controls.zoomLimitsEnabled = true;
  controls.minZoom = limits.min;
  controls.maxZoom = limits.max;
  controls.zoomLimits = { min: limits.min, max: limits.max };
}

function configureInteractiveOrbit(controls) {
  if (!controls) return;

  controls.enableRotate = true;
  controls.enablePan = true;
  controls.enableZoom = true;
}

function isOrbitInteractionFrozen(viewer) {
  return viewer.parentElement?.dataset?.resizeFrozen === "true";
}

function getOrbitPanFactor(viewer, controls) {
  const baseZoom = viewer._baseSplineZoom ?? controls.object?.zoom ?? 1;
  const zoom = controls.object?.zoom ?? baseZoom;
  return 0.04 * Math.max(1, zoom / baseZoom);
}

function queueOrbitPan(viewer, controls, spline, deltaX, deltaY = 0) {
  if (!controls || controls.enablePan === false) return;
  if (!deltaX && !deltaY) return;

  viewer._panWheelDeltaX = (viewer._panWheelDeltaX ?? 0) + deltaX;
  viewer._panWheelDeltaY = (viewer._panWheelDeltaY ?? 0) + deltaY;
  scheduleOrbitPanFlush(viewer, controls, spline);
}

function scheduleOrbitPanFlush(viewer, controls, spline) {
  if (viewer._panFlushFrame) return;

  viewer._panFlushFrame = requestAnimationFrame(() => {
    viewer._panFlushFrame = null;

    const deltaX = viewer._panWheelDeltaX ?? 0;
    const deltaY = viewer._panWheelDeltaY ?? 0;
    viewer._panWheelDeltaX = 0;
    viewer._panWheelDeltaY = 0;

    if (!deltaX && !deltaY) return;

    const panFactor = getOrbitPanFactor(viewer, controls);
    controls.pan(-deltaX * panFactor, -deltaY * panFactor);
    controls.update?.();
    spline?.requestRender?.();
  });
}

function getWheelPanDeltas(deltaX, deltaY) {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const panAxisRatio = 0.55;

  if (absX > absY * panAxisRatio) {
    return { panX: deltaX, panY: 0 };
  }

  if (absY > absX * panAxisRatio) {
    return { panX: 0, panY: deltaY };
  }

  return { panX: deltaX, panY: deltaY };
}

function applyOrbitRotation(controls, spline, deltaX, deltaY) {
  if (!controls || controls.enableRotate === false) return;
  if (!deltaX && !deltaY) return;

  controls.rotateLeft(-deltaX * 0.005);
  controls.rotateUp(-deltaY * 0.005);
  controls.update?.();
  spline?.requestRender?.();
}

function installSplineOrbitInteraction(viewer, controls, spline, host) {
  if (!controls || !spline || !host || viewer._orbitInteractionInstalled) return;

  viewer._orbitInteractionInstalled = true;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (event) => {
    if (event.button !== 0 || isOrbitInteractionFrozen(viewer)) return;
    if (!isEventOverSplineViewer(event, viewer, host)) return;

    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    host.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (!dragging || isOrbitInteractionFrozen(viewer)) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    applyOrbitRotation(controls, spline, dx, dy);
    event.preventDefault();
  };

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    if (host.hasPointerCapture?.(event.pointerId)) {
      host.releasePointerCapture(event.pointerId);
    }
  };

  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", endDrag);
  host.addEventListener("pointercancel", endDrag);

  viewer._orbitInteractionCleanup = () => {
    host.removeEventListener("pointerdown", onPointerDown);
    host.removeEventListener("pointermove", onPointerMove);
    host.removeEventListener("pointerup", endDrag);
    host.removeEventListener("pointercancel", endDrag);
  };
}

function clampZoomTarget(viewer, value) {
  const limits = viewer._splineZoomLimits;
  if (!limits || !Number.isFinite(value)) return value;
  return Math.min(limits.max, Math.max(limits.min, value));
}

function applySplineZoom(controls, spline, zoom) {
  if (!controls?.object || !Number.isFinite(zoom)) return;

  controls.object.zoom = zoom;
  controls.object.updateProjectionMatrix();
  controls.zoomChanged = true;
  controls.update?.();
  spline?.requestRender?.();
}

function startSmoothZoomAnimation(viewer, controls, spline) {
  if (viewer._zoomAnimFrame) return;

  const step = () => {
    const limits = viewer._splineZoomLimits;
    if (!limits || !controls?.object) {
      viewer._zoomAnimFrame = null;
      return;
    }

    const current = controls.object.zoom;
    const target = clampZoomTarget(viewer, viewer._zoomTarget ?? current);
    const diff = target - current;

    if (Math.abs(diff) <= ZOOM_STOP_EPSILON) {
      if (current !== target) {
        applySplineZoom(controls, spline, target);
      }
      viewer._zoomAnimFrame = null;
      return;
    }

    const t = Math.min(1, Math.abs(diff) / Math.max(limits.max - limits.min, 1));
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const blend = ZOOM_SMOOTHING + ease * 0.08;
    const next = current + diff * blend;

    applySplineZoom(controls, spline, next);
    viewer._zoomAnimFrame = requestAnimationFrame(step);
  };

  viewer._zoomAnimFrame = requestAnimationFrame(step);
}

function isEventOverSplineViewer(event, viewer, host) {
  const path = event.composedPath?.() ?? [];
  if (path.includes(viewer) || (host != null && path.includes(host))) {
    return true;
  }

  const target = event.target;
  return Boolean(
    target &&
      (viewer.shadowRoot?.contains(target) ||
        host?.contains(target) ||
        viewer.contains(target)),
  );
}

function installSmoothSplineZoom(viewer, controls, spline) {
  if (!controls || !spline || viewer._smoothZoomInstalled) return;

  const host = viewer.parentElement;
  if (!host) return;

  viewer._smoothZoomInstalled = true;
  viewer._zoomTarget = controls.object?.zoom ?? viewer._baseSplineZoom;

  const onWheel = (event) => {
    if (!viewer._splineZoomLimits) return;
    if (!isEventOverSplineViewer(event, viewer, host)) return;

    const { deltaX, deltaY } = event;
    const isBrowserZoomGesture = event.ctrlKey || event.metaKey;

    if (isBrowserZoomGesture) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (controls.enableZoom === false || !deltaY) return;

      const pinchBoost = 1.6;
      const step =
        Math.min(Math.abs(deltaY) / 380, 0.34) *
        ZOOM_WHEEL_SENSITIVITY *
        pinchBoost;
      const factor = deltaY < 0 ? 1 + step : 1 - step;
      const current = viewer._zoomTarget ?? controls.object.zoom;

      viewer._zoomTarget = clampZoomTarget(viewer, current * factor);
      startSmoothZoomAnimation(viewer, controls, spline);
      return;
    }

    if (isOrbitInteractionFrozen(viewer)) return;
    if (controls.enablePan === false) return;

    const { panX, panY } = getWheelPanDeltas(deltaX, deltaY);
    if (!panX && !panY) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    queueOrbitPan(viewer, controls, spline, panX, panY);
  };

  window.addEventListener("wheel", onWheel, { capture: true, passive: false });

  viewer._smoothZoomCleanup = () => {
    window.removeEventListener("wheel", onWheel, { capture: true });
    if (viewer._zoomAnimFrame) {
      cancelAnimationFrame(viewer._zoomAnimFrame);
      viewer._zoomAnimFrame = null;
    }
    if (viewer._panFlushFrame) {
      cancelAnimationFrame(viewer._panFlushFrame);
      viewer._panFlushFrame = null;
    }
    viewer._panWheelDeltaX = 0;
    viewer._panWheelDeltaY = 0;
  };
}

function getOrthoFrustumSpan(camera) {
  if (!camera?.isOrthographicCamera) return null;

  return {
    vertical: Math.abs(camera.top - camera.bottom),
    horizontal: Math.abs(camera.right - camera.left),
  };
}

function getSplineFitSpan(camera, container, fillFactor) {
  const frustum = getOrthoFrustumSpan(camera);
  const isCompactThumb =
    fillFactor > 0.85 && container.clientWidth > 0 && container.clientWidth < 120;

  if (frustum && isCompactThumb) {
    return frustum;
  }

  return {
    vertical: container.clientHeight,
    horizontal: container.clientWidth,
  };
}

function lockGallerySplineControls(viewer) {
  const controls = viewer._spline ? getOrbitControls(viewer._spline) : null;
  if (!controls) return;

  controls.enableRotate = false;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.autoRotate = false;
  controls.update?.();
}

function frameSplineSubject(
  viewer,
  zoomScale = 1,
  limitZoom = false,
  fillFactor = 0.68,
  maxZoom = 14,
) {
  const spline = viewer._spline;
  const container = viewer.parentElement;
  if (!spline || !container) return false;

  const bounds = getMeshBounds(spline);
  const controls = getOrbitControls(spline);
  const camera = spline._camera;
  if (!bounds || !controls || !camera) return false;

  const { center, size } = bounds;
  const dx = center.x - controls.target.x;
  const dy = center.y - controls.target.y;
  const dz = center.z - controls.target.z;

  controls.target.set(center.x, center.y, center.z);
  camera.position.x += dx;
  camera.position.y += dy;
  camera.position.z += dz;
  controls.update?.();

  const fitSpan = getSplineFitSpan(camera, container, fillFactor);
  const zoomForHeight = fitSpan.vertical / (size.y / fillFactor);
  const zoomForWidth = fitSpan.horizontal / (size.x / fillFactor);
  const targetZoom = Math.min(zoomForHeight, zoomForWidth);

  if (Number.isFinite(targetZoom) && targetZoom > 0) {
    const baseZoom = Math.min(targetZoom * zoomScale, maxZoom);
    viewer._baseSplineZoom = baseZoom;

    if (limitZoom) {
      const limits = {
        min: baseZoom * SPLINE_ZOOM_OUT_MIN_FACTOR,
        max: baseZoom * SPLINE_ZOOM_IN_MAX_FACTOR,
      };
      viewer._splineZoomLimits = limits;
      viewer._zoomTarget = baseZoom;
      configureInteractiveOrbit(controls);
      applyOrbitZoomLimits(controls, limits);
      installSmoothSplineZoom(viewer, controls, spline);
      installSplineOrbitInteraction(viewer, controls, spline, container);
    }

    spline.setZoom(baseZoom);
  }

  return true;
}

function applySplineFraming(viewer, zoomScale, limitZoom, fillFactor, maxZoom) {
  if (!viewer?._spline) return false;

  viewer._compactReframed = false;
  const framed = frameSplineSubject(viewer, zoomScale, limitZoom, fillFactor, maxZoom);

  if (framed && !limitZoom) {
    lockGallerySplineControls(viewer);
  }

  if (framed && limitZoom) {
    const controls = getOrbitControls(viewer._spline);
    const container = viewer.parentElement;
    if (controls && viewer._splineZoomLimits) {
      configureInteractiveOrbit(controls);
      applyOrbitZoomLimits(controls, viewer._splineZoomLimits);
      viewer._zoomTarget = controls.object?.zoom ?? viewer._baseSplineZoom;
      installSmoothSplineZoom(viewer, controls, viewer._spline);
      installSplineOrbitInteraction(viewer, controls, viewer._spline, container);
    }
  }

  viewer._spline.requestRender?.();
  return framed;
}

function getSplineViewerFromContainer(container) {
  if (!container) return null;
  if (container.tagName?.toLowerCase?.() === "spline-viewer") return container;
  return container.querySelector?.("spline-viewer");
}

export function applySplineFramingToHost(
  container,
  zoomScale,
  limitZoom,
  fillFactor,
  maxZoom,
  { lockFraming = false } = {},
) {
  const viewer = getSplineViewerFromContainer(container);
  if (!viewer) return false;

  const framed = applySplineFraming(viewer, zoomScale, limitZoom, fillFactor, maxZoom);
  if (framed) {
    viewer._compactReframed = true;
    if (lockFraming) {
      viewer._handoffFramingLocked = true;
    }
  }

  return framed;
}

export function clearHandoffFramingLock(container) {
  const viewer = getSplineViewerFromContainer(container);
  if (viewer) {
    viewer._handoffFramingLocked = false;
  }
}

export function stabilizeSplineForHandoff(container) {
  const viewer = getSplineViewerFromContainer(container);
  if (!viewer?._spline) return false;

  stopRotationHold(viewer);
  stopIntroTurntable(viewer);

  if (viewer._panFlushFrame) {
    cancelAnimationFrame(viewer._panFlushFrame);
    viewer._panFlushFrame = null;
  }
  viewer._panWheelDeltaX = 0;
  viewer._panWheelDeltaY = 0;

  if (viewer._zoomAnimFrame) {
    cancelAnimationFrame(viewer._zoomAnimFrame);
    viewer._zoomAnimFrame = null;
  }

  const controls = getOrbitControls(viewer._spline);
  if (controls?.object) {
    viewer._zoomTarget = controls.object.zoom;
  }

  lockSplineRotation(viewer);
  viewer._spline.requestRender?.();

  return true;
}

function configureSplineViewer(
  viewer,
  zoomScale = 1,
  limitZoom = false,
  fillFactor = 0.68,
  maxZoom = 14,
  introTurntable = null,
  onFramed = null,
) {
  hideSplineChrome(viewer);
  hideSplineSceneBackground(viewer._spline);

  viewer._spline?._scene?.traverseEntity?.((entity) => {
    if (entity.name === "Rectangle") {
      entity.visible = false;
    }
  });

  resizeSplineViewer(viewer);

  const finalize = (attemptFrame = false) => {
    hideSplineChrome(viewer);
    hideSplineSceneBackground(viewer._spline);
    resizeSplineViewer(viewer);

    if (attemptFrame && !viewer._initialFramed) {
      viewer._initialFramed = frameSplineSubject(
        viewer,
        zoomScale,
        limitZoom,
        fillFactor,
        maxZoom,
      );

      if (viewer._initialFramed && !limitZoom) {
        lockGallerySplineControls(viewer);
      }

      if (viewer._initialFramed && introTurntable) {
        startIntroTurntable(
          viewer,
          getOrbitControls(viewer._spline),
          viewer._spline,
          introTurntable,
        );
      }

      if (viewer._initialFramed && onFramed && !viewer._framedCallbackFired) {
        viewer._framedCallbackFired = true;
        onFramed();
      }
    } else if (limitZoom) {
      const controls = getOrbitControls(viewer._spline);
      const container = viewer.parentElement;
      if (controls && viewer._splineZoomLimits) {
        configureInteractiveOrbit(controls);
        applyOrbitZoomLimits(controls, viewer._splineZoomLimits);
        installSmoothSplineZoom(viewer, controls, viewer._spline);
        installSplineOrbitInteraction(viewer, controls, viewer._spline, container);
      }
    }

    viewer._spline?.setBackgroundColor("transparent");
    viewer._spline?.requestRender?.();
  };

  requestAnimationFrame(() => finalize(true));

  if (introTurntable) {
    window.setTimeout(() => {
      if (!viewer._initialFramed) finalize(true);
    }, 500);
  } else {
    window.setTimeout(() => {
      if (!viewer._initialFramed) finalize(true);
    }, 300);
    window.setTimeout(() => {
      if (!viewer._initialFramed) finalize(true);
    }, 1000);
  }
}

export default function SplinePlanktonViewer({
  url,
  viewerSrc: _viewerSrc,
  className,
  zoomScale = 1,
  fillFactor = 0.68,
  maxZoom = 14,
  limitZoom = false,
  previewSize = null,
  introTurntableMs = null,
  introTurntableRotations = 2,
  frozen = false,
  resizeFrozen = false,
  notifyWhenFramed = false,
  onSceneReady = null,
  enabled = true,
  loading = "lazy",
}) {
  const containerRef = useRef(null);
  const framingRef = useRef({ zoomScale, fillFactor, maxZoom, limitZoom });
  const loadingRef = useRef(loading);
  const [ready, setReady] = useState(false);
  framingRef.current = { zoomScale, fillFactor, maxZoom, limitZoom };
  loadingRef.current = loading;
  const introTurntable =
    introTurntableMs != null
      ? { durationMs: introTurntableMs, rotations: introTurntableRotations }
      : null;
  const introTurntableRef = useRef(introTurntable);
  if (introTurntable) {
    introTurntableRef.current = introTurntable;
  }

  useEffect(() => {
    let cancelled = false;

    loadSplineViewerModule().then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !ready || !url || !containerRef.current) return;

    const viewer = document.createElement("spline-viewer");
    viewer.setAttribute("url", url);
    viewer.setAttribute("background", "transparent");
    viewer.setAttribute("loading", loadingRef.current);
    viewer.setAttribute("hint", "false");
    viewer.setAttribute("events-target", "local");
    viewer.style.width = "100%";
    viewer.style.height = "100%";
    viewer.style.display = "block";
    viewer.style.background = "transparent";

    const onLoadComplete = () => {
      const framing = framingRef.current;
      configureSplineViewer(
        viewer,
        framing.zoomScale,
        limitZoom,
        framing.fillFactor,
        framing.maxZoom,
        introTurntableRef.current,
        notifyWhenFramed ? onSceneReady : null,
      );

      if (!notifyWhenFramed) {
        onSceneReady?.();
      }
    };

    viewer.addEventListener("load-complete", onLoadComplete);
    containerRef.current.replaceChildren(viewer);

    let resizeFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      if (!viewer._spline) return;
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        if (containerRef.current?.dataset.resizeFrozen === "true") {
          viewer._spline.requestRender?.();
          return;
        }

        resizeSplineViewer(viewer);

        const host = containerRef.current;
        const framing = framingRef.current;
        if (
          !viewer._handoffFramingLocked &&
          framing.fillFactor > 0.85 &&
          !viewer._compactReframed &&
          host &&
          host.clientWidth >= 40 &&
          host.clientHeight >= 40
        ) {
          frameSplineSubject(
            viewer,
            framing.zoomScale,
            limitZoom,
            framing.fillFactor,
            framing.maxZoom,
          );
          viewer._compactReframed = true;
        }

        viewer._spline.requestRender?.();
      });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      viewer.removeEventListener("load-complete", onLoadComplete);
      viewer._smoothZoomCleanup?.();
      viewer._orbitInteractionCleanup?.();
      stopRotationHold(viewer);
      stopIntroTurntable(viewer);
      viewer.remove();
    };
  }, [enabled, ready, url, limitZoom, maxZoom, notifyWhenFramed, onSceneReady]);

  useEffect(() => {
    if (!enabled || !limitZoom) return;
    const viewer = containerRef.current?.querySelector("spline-viewer");
    if (!viewer?._spline || !viewer._initialFramed) return;
    if (viewer._handoffFramingLocked || resizeFrozen) return;
    applySplineFraming(viewer, zoomScale, limitZoom, fillFactor, maxZoom);
  }, [enabled, limitZoom, zoomScale, fillFactor, maxZoom, resizeFrozen]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.dataset.resizeFrozen =
      frozen || resizeFrozen ? "true" : "false";
    const viewer = containerRef.current.querySelector("spline-viewer");
    if (!viewer) return;

    if (frozen) {
      lockSplineRotation(viewer);
    } else {
      unlockSplineRotation(viewer);
    }

    return () => {
      unlockSplineRotation(viewer);
    };
  }, [frozen, resizeFrozen]);

  const previewStyle = previewSize
    ? { width: `${previewSize.width}px`, height: `${previewSize.height}px` }
    : undefined;

  return (
    <div
      ref={containerRef}
      className={className ? `spline-viewer-host ${className}` : "spline-viewer-host"}
      style={previewStyle}
      aria-hidden={!url}
    />
  );
}
