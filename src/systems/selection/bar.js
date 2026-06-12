// Панель действий над выделением (#selbar): копировать/вырезать/вставить/
// удалить/снять. Видна, пока есть активное выделение — снять можно при любом
// инструменте, не только при «Выделении».
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';

export function mount() {
  $('sel-copy').onclick = () => actions.run('edit.copy');
  $('sel-cut').onclick = () => actions.run('edit.cut');
  $('sel-paste').onclick = () => actions.run('edit.paste');
  $('sel-del').onclick = () => actions.run('edit.delete');
  $('sel-off').onclick = () => actions.run('select.none');
  const sync = () => $('selbar').classList.toggle('on', !!S.sel && !S.selFloat);
  bus.on('selection', sync); sync();
}
