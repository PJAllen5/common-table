#!/usr/bin/env node
/* Write the made-up demo data as JSON files, one per shared-database document,
   for loading into the hosted demo's shared database.
   Run from the repo root:  node scripts/export-seed.js
   Output: dist/seed/<collection>/<id>.json  (dist/ is ignored by git) */
const fs = require('fs');
const path = require('path');
const { fresh, toSources } = require('../data.js');

const out = path.join(__dirname, '..', 'dist', 'seed');
fs.rmSync(out, { recursive: true, force: true });
const src = toSources(fresh());
let count = 0;
for (const [coll, docs] of Object.entries(src)) {
  for (const [id, doc] of Object.entries(docs)) {
    fs.mkdirSync(path.join(out, coll), { recursive: true });
    fs.writeFileSync(path.join(out, coll, id + '.json'), JSON.stringify(doc));
    count++;
  }
}
console.log(`Wrote ${count} documents to ${out}`);
