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

// Новый порядок секции при перестановке: перетаскиваемые (ids) встают перед
// beforeId, либо в конец своей секции (папки и работы переставляются раздельно,
// как в сетке). Возвращает id в финальном порядке секции (или null, если нечего
// двигать). Вызывающий записывает строго убывающий order по этому списку.
export function reorderedIds(items, ids, beforeId) {
  const moving = sortGalleryItems(items.filter((x) => ids.includes(x.id)));
  if (!moving.length) return null;
  const isFolder = moving[0].kind === 'folder';
  const rest = sortGalleryItems(items.filter((x) => !ids.includes(x.id) && (x.kind === 'folder') === isFolder));
  let at = beforeId ? rest.findIndex((x) => x.id === beforeId) : -1;
  if (at < 0) at = rest.length; // нет цели или цель другой секции → в конец
  return [...rest.slice(0, at), ...moving, ...rest.slice(at)].map((x) => x.id);
}
