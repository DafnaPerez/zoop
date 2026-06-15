export function publicUrl(path) {
  const normalized = path.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${normalized}`;
}

export function injectPublicAssetStyles() {
  if (document.getElementById("public-asset-styles")) return;

  const style = document.createElement("style");
  style.id = "public-asset-styles";
  style.textContent = `@font-face{font-family:"RobotoMono";src:url("${publicUrl("/fonts/RobotoMono-Regular.ttf")}") format("truetype");font-weight:400;font-style:normal;font-display:swap;}`;
  document.head.appendChild(style);
}
