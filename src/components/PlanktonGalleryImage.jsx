import { useState } from "react";
import { getPlanktonGalleryImage } from "../utils/planktonGalleryImage";

export default function PlanktonGalleryImage({
  plankton,
  offset = 0,
  float = false,
  className = "",
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const ringIndex = Math.min(Math.abs(offset), 2);
  const imageScale = plankton.galleryImageScale ?? 1;

  const classes = [
    "plankton-visual",
    "plankton-visual--gallery-image",
    float ? "plankton-visual--float" : "",
    float ? `plankton-visual--float-ring-${ringIndex}` : "",
    imageFailed ? "plankton-visual--placeholder" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (imageFailed) {
    return <div className={classes} aria-hidden="true" />;
  }

  return (
    <div className={classes}>
      <img
        src={getPlanktonGalleryImage(plankton)}
        alt=""
        className="plankton-gallery-image"
        draggable={false}
        decoding="async"
        style={
          imageScale !== 1
            ? { transform: `scale(${imageScale})` }
            : undefined
        }
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}
