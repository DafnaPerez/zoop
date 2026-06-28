import * as THREE from "three";

function isSceneGroupBounds(size) {
  const maxDim = Math.max(size.x, size.y, size.z);
  const minDim = Math.min(size.x, size.y, size.z);
  return maxDim > 500 && minDim / maxDim > 0.8;
}

function getBoundsFromVertices(verts) {
  if (!verts?.length) return null;

  const xs = verts.map((v) => v.x);
  const ys = verts.map((v) => v.y);
  const zs = verts.map((v) => v.z);
  const size = {
    x: Math.max(...xs) - Math.min(...xs),
    y: Math.max(...ys) - Math.min(...ys),
    z: Math.max(...zs) - Math.min(...zs),
  };

  if (!size.x && !size.y && !size.z) return null;

  return {
    center: new THREE.Vector3(
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2,
      (Math.min(...zs) + Math.max(...zs)) / 2,
    ),
    size,
  };
}

function getMeshEntity(spline) {
  let meshEntity = null;
  let largestFallback = null;
  let largestVolume = 0;

  spline._scene?.traverseEntity?.((entity) => {
    const bounds = getBoundsFromVertices(entity.singleBBox?.vertices);
    if (!bounds) return;

    if (entity.name === "mesh_node") {
      meshEntity = { entity, bounds };
      return;
    }

    if (isSceneGroupBounds(bounds.size)) return;

    const volume = bounds.size.x * bounds.size.y * bounds.size.z;
    if (volume > largestVolume) {
      largestVolume = volume;
      largestFallback = { entity, bounds };
    }
  });

  return meshEntity ?? largestFallback;
}

const scratchLocal = new THREE.Vector3();
const scratchWorld = new THREE.Vector3();
const scratchNormal = new THREE.Vector3();
const scratchProjected = new THREE.Vector3();
const scratchCameraDir = new THREE.Vector3();
const scratchNdc = new THREE.Vector2();
const scratchRaycaster = new THREE.Raycaster();
const scratchProbeCamera = new THREE.PerspectiveCamera();
const scratchProbeMesh = new THREE.Mesh();
scratchProbeMesh.material = new THREE.MeshBasicMaterial();

function syncProbeCamera(source) {
  scratchProbeCamera.fov = source.fov;
  scratchProbeCamera.aspect = source.aspect;
  scratchProbeCamera.near = source.near;
  scratchProbeCamera.far = source.far;
  scratchProbeCamera.zoom = source.zoom ?? 1;
  scratchProbeCamera.position.set(
    source.position.x,
    source.position.y,
    source.position.z,
  );
  scratchProbeCamera.quaternion.set(
    source.quaternion.x,
    source.quaternion.y,
    source.quaternion.z,
    source.quaternion.w,
  );
  scratchProbeCamera.updateMatrixWorld(true);
  return scratchProbeCamera;
}

function syncProbeMesh(source) {
  scratchProbeMesh.geometry = source.geometry;
  scratchProbeMesh.matrixWorld.copy(source.matrixWorld);
  scratchProbeMesh.matrixAutoUpdate = false;
  return scratchProbeMesh;
}

function getHotspotLocalPoint(hotspot, bounds) {
  if (hotspot.localPoint) {
    return scratchLocal.set(
      hotspot.localPoint.x,
      hotspot.localPoint.y,
      hotspot.localPoint.z,
    );
  }

  if (!hotspot.localOffset) return null;

  const { localOffset } = hotspot;
  return scratchLocal.set(
    bounds.center.x + localOffset.x * bounds.size.x * 0.5,
    bounds.center.y + localOffset.y * bounds.size.y * 0.5,
    bounds.center.z + localOffset.z * bounds.size.z * 0.5,
  );
}

function getSurfaceFacingScore(meshEntity, anchorLocalPoint, worldPoint, camera) {
  const geometry = meshEntity?.geometry;
  const normals = geometry?.attributes?.normal;

  if (!normals || !anchorLocalPoint) {
    scratchCameraDir.copy(camera.position).sub(worldPoint).normalize();
    return scratchCameraDir.lengthSq() > 0 ? 1 : 0;
  }

  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < normals.count; i += 1) {
    const dx = geometry.attributes.position.getX(i) - anchorLocalPoint.x;
    const dy = geometry.attributes.position.getY(i) - anchorLocalPoint.y;
    const dz = geometry.attributes.position.getZ(i) - anchorLocalPoint.z;
    const dist = dx * dx + dy * dy + dz * dz;

    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  scratchNormal.set(
    normals.getX(bestIndex),
    normals.getY(bestIndex),
    normals.getZ(bestIndex),
  );
  scratchNormal.transformDirection(meshEntity.matrixWorld).normalize();
  scratchCameraDir.copy(camera.position).sub(worldPoint).normalize();

  return scratchNormal.dot(scratchCameraDir);
}

function isHotspotOccluded(meshEntity, worldPoint, camera) {
  scratchNdc.set(scratchProjected.x, scratchProjected.y);

  const probeCamera = syncProbeCamera(camera);
  const probeMesh = syncProbeMesh(meshEntity);

  scratchRaycaster.setFromCamera(scratchNdc, probeCamera);
  const hits = scratchRaycaster.intersectObject(probeMesh, false);
  if (!hits.length) return false;

  const anchorDist = probeCamera.position.distanceTo(worldPoint);
  const tolerance = Math.max(anchorDist * 0.04, 2);

  return Math.abs(hits[0].distance - anchorDist) > tolerance;
}

export function getHotspotWorldPosition(spline, hotspot) {
  const mesh = getMeshEntity(spline);
  if (!mesh?.entity || !hotspot) return null;

  mesh.entity.updateWorldMatrix?.(true, true);

  const bounds = getBoundsFromVertices(mesh.entity.singleBBox?.vertices) ?? mesh.bounds;
  const localPoint = getHotspotLocalPoint(hotspot, bounds);
  if (!localPoint) return null;

  const world = new THREE.Vector3(localPoint.x, localPoint.y, localPoint.z);
  if (hotspot.localPoint) {
    mesh.entity.localToWorld(world);
  }

  return world;
}

export function projectSplineHotspots(spline, host, hotspots) {
  const mesh = getMeshEntity(spline);
  const camera = spline?._camera;
  if (!mesh?.entity || !camera || !host?.clientWidth) return {};

  mesh.entity.updateWorldMatrix?.(true, true);
  camera.updateMatrixWorld?.(true, true);

  const bounds = getBoundsFromVertices(mesh.entity.singleBBox?.vertices) ?? mesh.bounds;
  const positions = {};

  for (const hotspot of hotspots) {
    const localPoint = getHotspotLocalPoint(hotspot, bounds);
    if (!localPoint) continue;

    scratchWorld.copy(localPoint);
    if (hotspot.localPoint) {
      mesh.entity.localToWorld(scratchWorld);
    }

    const facingScore = getSurfaceFacingScore(
      mesh.entity,
      hotspot.localPoint,
      scratchWorld,
      camera,
    );

    scratchProjected.copy(scratchWorld).project(camera);

    const occluded = isHotspotOccluded(mesh.entity, scratchWorld, camera);

    const inViewport =
      scratchProjected.z > -1 &&
      scratchProjected.z < 1 &&
      scratchProjected.x >= -1.08 &&
      scratchProjected.x <= 1.08 &&
      scratchProjected.y >= -1.08 &&
      scratchProjected.y <= 1.08;

    positions[hotspot.id] = {
      x: (scratchProjected.x * 0.5 + 0.5) * 100,
      y: (-scratchProjected.y * 0.5 + 0.5) * 100,
      facingScore,
      occluded,
      inViewport,
      visible: inViewport && !occluded && facingScore > 0.32,
    };
  }

  return positions;
}

export function getSplineViewerFromHost(host) {
  return host?.querySelector?.("spline-viewer") ?? null;
}
