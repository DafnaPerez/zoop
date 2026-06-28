export default function DetailSketchCallout({ hotspot, visible }) {
  if (!hotspot || !visible) return null;

  return (
    <div className="detail-sketch-callout detail-sketch-callout--visible" role="tooltip">
      <p className="detail-hotspot-callout-label">{hotspot.label}</p>
      <p className="detail-hotspot-callout-text">{hotspot.text}</p>
    </div>
  );
}
