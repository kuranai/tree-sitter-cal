# tree-sitter-cal

Tree-sitter grammar for Microsoft Dynamics NAV C/AL (NAV 2018 C/SIDE text exports).

## Scope

- Input format: NAV C/SIDE `OBJECT ...` text export files.
- Object types: Table, Page, Report, Codeunit, XMLport, Query, MenuSuite.
- Hybrid AST:
  - typed object and code sections,
  - generic metadata entry parsing,
  - full statement/expression AST for trigger/procedure code.
- `RDLDATA` and `WORDLAYOUT` are parsed as opaque payload sections with explicit end markers.

## Commands

```bash
npm run generate
npm run test
npm run parse:sample
npm run parse:all
```

## Corpus Validation

- `scripts/select_sample.js` creates a deterministic 300-file stratified sample.
- `scripts/parse_corpus.js` parses either sample or full corpus and writes reports:
  - `testdata/sample_300_paths.txt`
  - `testdata/parse_report_sample.json`
  - `testdata/parse_report_all.json`

## Notes

- Grammar target is C/AL export syntax, not AL (`.al`) extension syntax.
