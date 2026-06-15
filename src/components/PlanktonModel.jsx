import { OrbitControls } from "@react-three/drei";
import PlanktonScene from "./PlanktonScene";

export default function PlanktonModel(props) {
  return (
    <>
      <PlanktonScene {...props} />
      <OrbitControls enablePan={false} />
    </>
  );
}
