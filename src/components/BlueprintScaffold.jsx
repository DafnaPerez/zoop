export function BlueprintScaffold() {
  return (
    <>
      <div className="blueprint-grid" aria-hidden="true" />
      <div className="blueprint-vignette" aria-hidden="true" />
    </>
  );
}

export function BlueprintFrame({ label = "SPECIMEN" }) {
  return (
    <div className="blueprint-frame" aria-hidden="true">
      <span className="blueprint-corner blueprint-corner--tl" />
      <span className="blueprint-corner blueprint-corner--tr" />
      <span className="blueprint-corner blueprint-corner--bl" />
      <span className="blueprint-corner blueprint-corner--br" />
      <span className="blueprint-frame-dash" />
      <span className="blueprint-frame-label">{label}</span>
    </div>
  );
}
