import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";

export default function PlanktonScene({
  modelPath,
  scale = 2,
  hoverAmplitude = 0.12,
  rotationSpeed = 0.003,
  phaseOffset = 0,
}) {
  const groupRef = useRef();
  const { scene } = useGLTF(modelPath);
  const model = useMemo(() => scene.clone(), [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime() + phaseOffset;

    groupRef.current.rotation.y += rotationSpeed;
    groupRef.current.position.y = Math.sin(time * 1.5) * hoverAmplitude;
  });

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 4, 5]} intensity={2} />

      <group ref={groupRef} scale={scale}>
        <Center>
          <primitive object={model} />
        </Center>
      </group>
    </>
  );
}
