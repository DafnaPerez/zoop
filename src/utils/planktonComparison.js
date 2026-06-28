function getPlanktonDetailRows(plankton) {
  const rows = [
    { label: "Taxonomy", value: plankton.taxonomy },
    {
      label: plankton.habitat ? "Habitat" : "Depth",
      value: plankton.habitat ?? plankton.depth ?? "—",
    },
    { label: "Size", value: plankton.size ?? "—" },
  ];

  const sections =
    plankton.detailSections ??
    (plankton.description
      ? [{ label: "Notes", text: plankton.description }]
      : []);

  sections.forEach((section) => {
    rows.push({ label: section.label, value: section.text });
  });

  return rows;
}

export function buildComparisonTable(left, right) {
  const leftRows = getPlanktonDetailRows(left);
  const rightRows = getPlanktonDetailRows(right);
  const labels = [
    ...new Set([...leftRows.map((row) => row.label), ...rightRows.map((row) => row.label)]),
  ];
  const leftMap = Object.fromEntries(leftRows.map((row) => [row.label, row.value]));
  const rightMap = Object.fromEntries(rightRows.map((row) => [row.label, row.value]));

  return labels.map((label) => ({
    label,
    left: leftMap[label] ?? "—",
    right: rightMap[label] ?? "—",
  }));
}

const SUMMARY_LABELS = new Set(["Taxonomy", "Habitat", "Size"]);

export function buildComparisonSummary(left, right) {
  return buildComparisonTable(left, right).filter((row) => SUMMARY_LABELS.has(row.label));
}
