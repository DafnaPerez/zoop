function buildScaleTicks(maxMm, step = 0.5) {
  const ticks = [];
  const count = Math.round(maxMm / step);

  for (let index = 0; index <= count; index += 1) {
    const mm = Number((index * step).toFixed(2));
    ticks.push({
      mm,
      major: index % 2 === 0,
      label: String(Math.round(mm)),
    });
  }

  return ticks;
}

export default function DetailSpecimenScale({ maxMm = 3 }) {
  const ticks = buildScaleTicks(maxMm);

  return (
    <div
      className="detail-scale-ref"
      style={{ "--scale-max-mm": maxMm }}
      aria-label={`Size reference, zero to ${maxMm} millimeters`}
    >
      <div className="detail-scale-ref-meta">
        <span className="detail-scale-ref-heading">Scale</span>
        <span className="detail-scale-ref-units">MM</span>
      </div>

      <div className="detail-scale-ref-ruler" aria-hidden="true">
        <span className="detail-scale-ref-bar" />
        {ticks.map(({ mm, major, label }) => (
          <span
            key={mm}
            className={`detail-scale-ref-tick${
              major ? " detail-scale-ref-tick--major" : ""
            }${mm === 0 ? " detail-scale-ref-tick--start" : ""}${
              mm === maxMm ? " detail-scale-ref-tick--end" : ""
            }`}
            style={{ "--tick-mm": mm }}
          >
            {major ? (
              <span className="detail-scale-ref-tick-label">{label}</span>
            ) : null}
            <span className="detail-scale-ref-tick-mark" />
          </span>
        ))}
      </div>
    </div>
  );
}
