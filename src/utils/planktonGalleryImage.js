import { publicUrl } from "./publicUrl";

export function getPlanktonGalleryImage(plankton) {
  if (plankton.galleryImage) return plankton.galleryImage;
  return publicUrl(`/gallery/${plankton.id}.png`);
}
