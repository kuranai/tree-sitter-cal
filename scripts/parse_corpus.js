#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { buildSample, writeSample, TYPE_ORDER } = require('./select_sample');

const ROOT = path.resolve(__dirname, '..');
const NAV_ROOT = path.join(ROOT, 'NAV_Standard');
const TESTDATA_DIR = path.join(ROOT, 'testdata');
const SAMPLE_PATHS_FILE = path.join(TESTDATA_DIR, 'sample_300_paths.txt');
const REPORT_SAMPLE_FILE = path.join(TESTDATA_DIR, 'parse_report_sample.json');
const REPORT_ALL_FILE = path.join(TESTDATA_DIR, 'parse_report_all.json');
const PATHS_ALL_FILE = path.join(TESTDATA_DIR, 'all_paths.txt');

function usageAndExit() {
  process.stderr.write('Usage: node scripts/parse_corpus.js --sample|--all\n');
  process.exit(2);
}

function listAllPaths() {
  const files = [];
  for (const type of TYPE_ORDER) {
    const dirPath = path.join(NAV_ROOT, type);
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.txt')) {
        continue;
      }
      files.push(path.posix.join('NAV_Standard', type, entry.name));
    }
  }
  files.sort((left, right) => left.localeCompare(right));
  return files;
}

function writePathsFile(filePath, paths) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${paths.join('\n')}\n`, 'utf8');
}

function parseJsonSummary(rawOutput) {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch (innerError) {
        // Keep searching.
      }
    }

    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const candidate = lines[index].trim();
      if (!candidate.startsWith('{') && !candidate.startsWith('[')) {
        continue;
      }
      try {
        return JSON.parse(candidate);
      } catch (innerError) {
        // Keep searching.
      }
    }
  }

  return null;
}

function extractResults(summary) {
  if (!summary) {
    return [];
  }
  if (Array.isArray(summary)) {
    return summary;
  }
  if (Array.isArray(summary.parse_summaries)) {
    return summary.parse_summaries;
  }
  if (Array.isArray(summary.files)) {
    return summary.files;
  }
  if (Array.isArray(summary.results)) {
    return summary.results;
  }
  return [];
}

function resultPath(result) {
  return result.path || result.file || result.name || '';
}

function resultHasError(result) {
  if (typeof result.successful === 'boolean') {
    return !result.successful;
  }
  if (typeof result.has_error === 'boolean') {
    return result.has_error;
  }
  if (typeof result.error === 'boolean') {
    return result.error;
  }
  if (typeof result.errors === 'number') {
    return result.errors > 0;
  }
  if (typeof result.error_count === 'number') {
    return result.error_count > 0;
  }
  if (typeof result.status === 'string') {
    return /error|failed/i.test(result.status);
  }
  if (typeof result.output === 'string') {
    return result.output.includes('ERROR');
  }
  return false;
}

function runParse(pathsFile) {
  const args = [
    '--yes',
    'tree-sitter-cli@0.26.5',
    'parse',
    '-p',
    '.',
    '-q',
    '--json-summary',
    '--paths',
    pathsFile,
  ];

  const result = spawnSync('npx', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 200,
  });

  return result;
}

function summarize(mode, paths, parseRun) {
  const rawOutput = `${parseRun.stdout || ''}\n${parseRun.stderr || ''}`;
  const summaryJson = parseJsonSummary(rawOutput);
  const results = extractResults(summaryJson);

  let parseErrorFiles = [];

  if (results.length > 0) {
    parseErrorFiles = results
      .filter(resultHasError)
      .map(resultPath)
      .filter(Boolean)
      .sort();
  } else if (parseRun.status !== 0) {
    parseErrorFiles = paths.slice();
  }

  const fatalCount = parseRun.status === null ? paths.length : 0;
  const parseErrorCount = parseErrorFiles.length;
  const successfulCount = Math.max(paths.length - parseErrorCount - fatalCount, 0);
  const successRate = paths.length === 0 ? 0 : successfulCount / paths.length;

  return {
    mode,
    timestamp_utc: new Date().toISOString(),
    total_files: paths.length,
    successful_files: successfulCount,
    parse_error_files: parseErrorCount,
    fatal_runs: fatalCount,
    success_rate: successRate,
    gate: {
      min_success_rate: 0.99,
      max_fatal_runs: 0,
      passed: successRate >= 0.99 && fatalCount === 0,
    },
    parse_error_paths: parseErrorFiles,
    command: {
      exit_code: parseRun.status,
      signal: parseRun.signal,
    },
    json_summary_available: summaryJson !== null,
  };
}

function main() {
  const modeArg = process.argv[2];
  if (modeArg !== '--sample' && modeArg !== '--all') {
    usageAndExit();
  }

  let paths;
  let pathsFile;
  let reportFile;

  if (modeArg === '--sample') {
    paths = buildSample();
    writeSample(paths);
    pathsFile = SAMPLE_PATHS_FILE;
    reportFile = REPORT_SAMPLE_FILE;
  } else {
    paths = listAllPaths();
    pathsFile = PATHS_ALL_FILE;
    reportFile = REPORT_ALL_FILE;
    writePathsFile(PATHS_ALL_FILE, paths);
  }

  writePathsFile(pathsFile, paths);

  const parseRun = runParse(pathsFile);
  const report = summarize(modeArg === '--sample' ? 'sample' : 'all', paths, parseRun);

  fs.mkdirSync(TESTDATA_DIR, { recursive: true });
  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `${report.mode}: total=${report.total_files} success=${report.successful_files} ` +
      `parse_errors=${report.parse_error_files} fatal=${report.fatal_runs} ` +
      `success_rate=${report.success_rate.toFixed(4)} gate=${report.gate.passed ? 'PASS' : 'FAIL'}\n`,
  );

  if (modeArg === '--all' && !report.gate.passed) {
    process.exit(1);
  }
  if (parseRun.status === null) {
    process.exit(1);
  }
}

main();
