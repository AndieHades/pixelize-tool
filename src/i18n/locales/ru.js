// Русская локаль (по умолчанию). Ключи по неймспейсам: tool/side/dialog/pop/
// label/btn/menu/adj/toast. Добавляешь ключ — добавь его и в остальные локали.
export const ru = {
  // верхняя панель и инструменты (tooltips)
  'tool.docs': 'Документы', 'tool.new': 'Новый документ (N)', 'tool.import': 'Импорт картинки (Ctrl+O)',
  'tool.export': 'Сохранить PNG (Ctrl+S)', 'tool.preview': 'Окно 1:1 (реальный размер)', 'tool.reference': 'Окно референса',
  'tool.fit': 'Вписать (0)', 'tool.zoomIn': 'Приблизить (+)', 'tool.zoomOut': 'Отдалить (−)',
  'tool.pencil': 'Карандаш (B)', 'tool.eraser': 'Ластик (E)', 'tool.fill': 'Заливка (F)',
  'tool.pick': 'Пипетка (I, пробел, Alt+клик)', 'tool.line': 'Линия (U)', 'tool.rect': 'Прямоугольник (K)',
  'tool.move': 'Перемещение слоя (ЛКМ-перетаскивание)', 'tool.adjust': 'Кисть-коррекция: осветлить / затемнить / тон',
  'tool.select': 'Выделение (M)', 'tool.layers': 'Слои (L) · ПКМ по холсту — выбор слоя', 'tool.color': 'Цвет (HSV)',
  // боковая панель
  'side.symV': 'Симметрия лево-право (S)', 'side.symH': 'Симметрия верх-низ (Shift+S)', 'side.pp': 'Пиксель-перфект (P)',
  'side.stab': 'Стабилизация штриха (T)', 'side.outline': 'Обводка контуром (O)', 'side.flipH': 'Отразить по горизонтали (H)',
  'side.flipV': 'Отразить по вертикали (V)', 'side.rotate': 'Поворот холста 90° (R)', 'side.mono': 'Монохром (всё изображение)',
  'side.bc': 'Яркость/контраст (всё изображение)', 'side.crop': 'Кроп (C): рамка → Enter', 'side.trim': 'Trim — обрезать пустые поля впритык к рисунку',
  // заголовки диалогов и попапов
  'dialog.new': 'Новый документ', 'dialog.save': 'Сохранить', 'dialog.palettes': 'Палитры', 'dialog.import': 'Импорт в пиксель-арт',
  'dialog.done': 'Готово', 'dialog.rename': 'Переименовать', 'dialog.panels': 'Кнопки панелей',
  'pop.color': 'Цвет', 'pop.bc': 'Яркость/контраст', 'pop.adjust': 'Кисть-коррекция', 'pop.glow': 'Свечение',
  'pop.shadow': 'Тень (Drop Shadow)', 'pop.outline': 'Обводка',
  // подписи полей
  'label.brightness': 'Яркость', 'label.contrast': 'Контраст', 'label.hue': 'Тон', 'label.saturation': 'Насыщенность',
  'label.value': 'Яркость', 'label.color': 'Цвет', 'label.opacity': 'Непрозр.', 'label.thickness': 'Толщина',
  'label.width': 'Ширина', 'label.height': 'Высота', 'label.rotate90': 'Поворот', 'label.colors': 'Цвета палитры',
  'label.detail': 'Детализация', 'label.bgTol': 'Отсечение фона', 'label.clean': 'Чистка мусора', 'label.symmetry': 'Симметрия',
  'label.range': 'Диапазон', 'label.intensity': 'Интенсивность', 'label.offsetX': 'Смещение X', 'label.offsetY': 'Смещение Y',
  'label.strength': 'Сила за штрих', 'label.current': 'Текущая', 'label.layerOpacity': 'Непрозрачность', 'label.preview': 'Превью',
  'label.reference': 'Референс', 'label.palette': 'Палитра',
  // кнопки
  'btn.apply': 'Применить', 'btn.cancel': 'Отмена', 'btn.close': 'Закрыть', 'btn.save': 'Сохранить', 'btn.create': 'Создать документ',
  'btn.done': 'Готово', 'btn.addPalette': 'Добавить в палитру', 'btn.outline': 'Обвести', 'btn.shadow': 'Создать тень',
  'btn.glow': 'Добавить свечение', 'btn.insertAsIs': 'Вставить как есть', 'btn.resetPanels': 'Сбросить панели',
  'btn.fromImage': 'Палитра из изображения…', 'btn.exportPng': 'PNG — картинка с прозрачным фоном',
  'btn.exportPsd': 'PSD — со слоями (Photoshop, Krita)',
  // коррекция
  'adj.dodge': 'Осветлить', 'adj.burn': 'Затемнить', 'adj.colorize': 'В активный цвет',
  // меню слоя
  'menu.rename': 'Переименовать…', 'menu.dupLayer': 'Дублировать слой', 'menu.selectAll': 'Выбрать всё на слое',
  'menu.invert': 'Инверсия выделения', 'menu.fill': 'Залить активным цветом', 'menu.clear': 'Очистить слой',
  'menu.symm': 'Симметрировать слой', 'menu.transform': 'Трансформировать…', 'menu.shadow': 'Тень (Drop Shadow)…',
  'menu.glow': 'Свечение…', 'menu.mono': 'В монохром', 'menu.bc': 'Яркость/контраст…', 'menu.clip': 'Обтравочная маска',
  'menu.pngFull': 'Сохранить PNG (весь холст)', 'menu.pngTight': 'Сохранить PNG (по контуру)', 'menu.send': 'Копировать в документ →',
  'menu.ungroup': 'Расформировать папку',
  'menu.copyHex': 'Копировать HEX', 'menu.replace': 'Заменить цвет…', 'menu.selectColor': 'Выбрать все пиксели', 'menu.deleteColor': 'Удалить из палитры',
};
