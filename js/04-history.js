    const cloneGrid = (g) => g.map((r) => r.map((c) => (c ? c.slice() : null)));
    function snapState() { return { cur, W, H, folderSeq, folders: folders.map((f) => ({ ...f })),
      layers: layers.map((L) => ({ name: L.name, opacity: L.opacity, visible: L.visible, fid: L.fid, clip: !!L.clip, ext: new Map(L.ext), grid: cloneGrid(L.grid) })) }; }
    function snapshot() { undoStack.push(snapState());
      const cap = W * H > 90000 ? 8 : (W * H > 20000 ? 15 : 30); // большие холсты — короче история, чтобы не съесть память
      if (undoStack.length > cap) undoStack.splice(0, undoStack.length - cap);
      redoStack.length = 0; strokeSeen.clear(); }
    function restore(s) { W = s.W; H = s.H; layers = s.layers; folders = s.folders; folderSeq = s.folderSeq;
      cur = Math.min(s.cur, layers.length - 1); marked.clear(); dirtyAll(); layList(); render(); }
    function doUndo() { if (!undoStack.length) { toast('Нечего отменять'); return; }
      redoStack.push(snapState()); restore(undoStack.pop()); toast('Отменено'); }
    function doRedo() { if (!redoStack.length) return; undoStack.push(snapState()); restore(redoStack.pop()); toast('Возвращено'); }

    // ---- инструменты ----
