import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import PlanktonGallery from "../components/PlanktonGallery";

export default function HomeScreen({
  collection,
  onSelect,
  onScanComplete,
  focusPlanktonId,
  handoffActive,
  galleryDockRef,
  specimenDocked,
  concealed,
}) {
  useEffect(() => {
    [...new Set(collection.map((p) => p.model).filter(Boolean))].forEach((model) =>
      useGLTF.preload(model),
    );
  }, [collection]);

  return (
    <PlanktonGallery
      planktons={collection}
      onSelect={onSelect}
      onScanComplete={onScanComplete}
      focusPlanktonId={focusPlanktonId}
      handoffActive={handoffActive}
      galleryDockRef={galleryDockRef}
      specimenDocked={specimenDocked}
      concealed={concealed}
    />
  );
}
