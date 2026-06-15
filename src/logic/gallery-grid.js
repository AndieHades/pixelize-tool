// Pure gallery ordering: folders are a separate leading section, artworks are newest first.
const rankTime = (item) => item.updated || item.order || 0;
const folderTime = (item) => item.order || item.updated || 0;

const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
const byId = (a, b) => String(a.id || '').localeCompare(String(b.id || ''));

export function sortGalleryItems(items) {
  return [...items].sort((a, b) => {
    const af = a.kind === 'folder', bf = b.kind === 'folder';
    if (af !== bf) return af ? -1 : 1;
    const at = af ? folderTime(a) : rankTime(a);
    const bt = bf ? folderTime(b) : rankTime(b);
    return (bt - at) || byName(a, b) || byId(a, b);
  });
}
