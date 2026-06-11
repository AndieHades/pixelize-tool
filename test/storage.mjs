// Тест персистентности: CRUD документов в IndexedDB (fake-indexeddb).
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { saveDoc, getDoc, listDocs, removeDoc } from '../src/core/storage.js';

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
