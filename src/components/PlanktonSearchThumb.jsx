import { getPlanktonGalleryImage } from "../utils/planktonGalleryImage";

export default function PlanktonSearchThumb({ plankton }) {
  return (
    <div className="gallery-search-result-thumb gallery-search-result-thumb--image" aria-hidden="true">
      <img
        src={getPlanktonGalleryImage(plankton)}
        alt=""
        className="gallery-search-result-thumb-image"
        draggable={false}
        decoding="async"
      />
    </div>
  );
}
