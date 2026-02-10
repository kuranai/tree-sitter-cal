#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NAV_ROOT = path.join(ROOT, 'NAV_Standard');
const OUTPUT_FILE = path.join(ROOT, 'testdata', 'sample_300_paths.txt');

const QUOTAS = {
  page: 130,
  table: 73,
  codeunit: 55,
  report: 37,
  query: 2,
  xmlport: 2,
  menusuite: 1,
};

const TYPE_ORDER = ['page', 'table', 'codeunit', 'report', 'query', 'xmlport', 'menusuite'];

function listTypeFiles(type) {
  const typeDir = path.join(NAV_ROOT, type);
  const entries = fs.readdirSync(typeDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.txt'))
    .map(entry => path.posix.join('NAV_Standard', type, entry.name))
    .sort();
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle(values, rng) {
  const array = values.slice();
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildSample(seed = 20260210) {
  const rng = createRng(seed);
  const selected = [];

  for (const type of TYPE_ORDER) {
    const files = listTypeFiles(type);
    const quota = QUOTAS[type];
    if (files.length < quota) {
      throw new Error(`Not enough files for ${type}: expected ${quota}, found ${files.length}`);
    }

    const shuffled = shuffle(files, rng);
    selected.push(...shuffled.slice(0, quota));
  }

  selected.sort((left, right) => {
    const leftType = left.split('/')[1];
    const rightType = right.split('/')[1];
    const typeDiff = TYPE_ORDER.indexOf(leftType) - TYPE_ORDER.indexOf(rightType);
    if (typeDiff !== 0) {
      return typeDiff;
    }
    return left.localeCompare(right);
  });

  return selected;
}

function writeSample(paths) {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${paths.join('\n')}\n`, 'utf8');
}

function main() {
  const sample = buildSample();
  if (sample.length !== 300) {
    throw new Error(`Expected 300 files, selected ${sample.length}`);
  }

  writeSample(sample);

  const byType = {};
  for (const filePath of sample) {
    const type = filePath.split('/')[1];
    byType[type] = (byType[type] || 0) + 1;
  }

  const summary = TYPE_ORDER.map(type => `${type}:${byType[type] || 0}`).join(', ');
  process.stdout.write(`Wrote ${sample.length} files to ${path.relative(ROOT, OUTPUT_FILE)} (${summary})\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  QUOTAS,
  TYPE_ORDER,
  buildSample,
  writeSample,
};
