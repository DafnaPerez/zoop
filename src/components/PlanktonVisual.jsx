import PlanktonGalleryImage from "./PlanktonGalleryImage";

export default function PlanktonVisual({
  plankton,
  offset = 0,
  float = false,
  className = "",
}) {
  return (
    <PlanktonGalleryImage
      plankton={plankton}
      offset={offset}
      float={float}
      className={className}
    />
  );
}
