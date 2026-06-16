// Pure gallery ordering: folders are a separate leading section. И папки, и
// работы сортируются по `order` (его двигает ручная перестановка), с откатом на
// `updated`. Новые работы получают order=Date.now(), поэтому по умолчанию идут
// новейшие сверху, но ручной порядок (setOrder) имеет приоритет и не сбивается
// автосейвом, который бампает только `updated`.
const rank = (item) => item.order || item.updated || 0;

const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
const byId = (a, b) => String(a.id || '').localeCompare(String(b.id || ''));

export function sortGalleryItems(items) {
  return [...items].sort((a, b) => {
    const af = a.kind === 'folder', bf = b.kind === 'folder';
    if (af !== bf) return af ? -1 : 1;
    return (rank(b) - rank(a)) || byName(a, b) || byId(a, b);
  });
}
