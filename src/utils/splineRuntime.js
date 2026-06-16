import { publicUrl } from "./publicUrl";

/** One Spline viewer bundle shared by every scene (avoids duplicate custom-element registration). */
export const SHARED_SPLINE_VIEWER = publicUrl(
  "/models/Calanus_finmarchicus_spline_viewer.js",
);
