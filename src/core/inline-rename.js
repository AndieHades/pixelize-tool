// Инлайн-переименование contentEditable-спана: единый механизм для слоёв и
// кистей. Фокус + выделение всего, Enter — сохранить, Escape — отмена, blur —
// сохранить. onSave(value|null): value — новое имя (изменено и непусто),
// null — без изменений (вызывающий просто перерисовывает).
export function inlineRename(span, name, onSave, max = 24) {
  if (!span) return;
  span.contentEditable = 'true'; span.classList.add('editing'); span.textContent = name; span.focus();
  const r = document.createRange(); r.selectNodeContents(span); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  let done = false;
  const finish = (save) => { if (done) return; done = true; span.contentEditable = 'false'; span.classList.remove('editing');
    span.removeEventListener('blur', onBlur); span.removeEventListener('keydown', onKey);
    const v = span.textContent.trim().slice(0, max); onSave(save && v && v !== name ? v : null); };
  const onBlur = () => finish(true);
  const onKey = (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); span.blur(); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); } };
  span.addEventListener('blur', onBlur); span.addEventListener('keydown', onKey);
}
