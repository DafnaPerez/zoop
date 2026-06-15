export function searchPlanktons(query, collection) {
  const term = query.trim().toLowerCase();
  if (!term) return [];

  return collection
    .map((plankton, index) => ({ plankton, index }))
    .filter(({ plankton }) => {
      const segments = plankton.taxonomy.split("/").map((part) => part.trim());
      const fields = [plankton.name, plankton.taxonomy, ...segments];

      return fields.some((field) => field.toLowerCase().includes(term));
    });
}
