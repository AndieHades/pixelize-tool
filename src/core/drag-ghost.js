// Призрак перетаскивания: клон самого элемента следует за курсором — единый
// вид для всех перетаскиваемых объектов (плитки галереи, строки слоёв).
// Возвращает { move(x, y), remove() }.
export function dragGhost(el, width) {
  const g = el.cloneNode(true);
  g.classList.add('drag-ghost');
  for (const c of ['dragging', 'lifting', 'sel', 'on', 'marked', 'swiping-right', 'drop-into', 'drop-before', 'drop-above']) g.classList.remove(c);
  g.querySelectorAll('.swipe-acts').forEach((n) => n.remove()); // кнопки свайпа в призраке не нужны
  const f = g.querySelector('.swipe-front'); if (f) f.style.transform = ''; // сбросить возможное смещение свайпа
  if (width) g.style.width = Math.round(width) + 'px';
  document.body.appendChild(g);
  return { move: (x, y) => { g.style.left = x + 'px'; g.style.top = y + 'px'; }, remove: () => g.remove() };
}
