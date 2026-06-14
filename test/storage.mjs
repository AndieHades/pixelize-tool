// Тест персистентности: CRUD документов в IndexedDB (fake-indexeddb).
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { saveDoc, getDoc, listDocs, removeDoc } from '../src/core/storage.js';
import { saveBrush, listBrushes, removeBrush, saveSet, listSets, removeSet } from '../src/core/brush-store.js';

const rec = { id: 'd1', name: 'Тест', W: 4, H: 4, updated: 1,
  layers: [{ name: 'a', grid: [[null, [1, 2, 3, 255]]], ext: new Map([['9,9', [5, 5, 5, 255]]]) }] };

await saveDoc(rec);
const got = await getDoc('d1');
assert.equal(got.name, 'Тест');
assert.deepEqual(got.layers[0].grid[0][1], [1, 2, 3, 255]);
assert.ok(got.layers[0].ext instanceof Map, 'ext восстановлен как Map');
assert.deepEqual(got.layers[0].ext.get('9,9'), [5, 5, 5, 255]);
assert.equal((await listDocs()).length, 1);
await removeDoc('d1');
assert.equal((await listDocs()).length, 0);

console.log('Storage-тест: IndexedDB CRUD (save/get/list/remove) ✓');

// --- библиотека кистей: кисти и наборы с маской (Uint8Array) ---
const set = { id: 's1', name: 'Pixel', order: 0 };
const br = { id: 'b1', name: 'Round', setId: 's1', order: 0, source: 'procreate',
  shape: 'shape', cov: { w: 2, h: 2, data: new Uint8Array([0, 255, 255, 0]) }, grain: null, params: { spacing: 1, jitter: 2 } };
await saveSet(set); await saveBrush(br);
const gotSets = await listSets(), gotBrushes = await listBrushes();
assert.equal(gotSets.length, 1); assert.equal(gotSets[0].name, 'Pixel');
assert.equal(gotBrushes.length, 1);
assert.ok(gotBrushes[0].cov.data instanceof Uint8Array, 'cov.data восстановлен как Uint8Array');
assert.deepEqual([...gotBrushes[0].cov.data], [0, 255, 255, 0]);
assert.equal(gotBrushes[0].params.jitter, 2);
await removeBrush('b1'); await removeSet('s1');
assert.equal((await listBrushes()).length, 0); assert.equal((await listSets()).length, 0);

console.log('Storage-тест: библиотека кистей (brush-store) ✓');
