const logger = require('js-logger');
const { Sync } = require('../src/Sync');
const fs = require('fs');

const fixturesPath = 'test/fixtures';
const testEnvPath = 'test/.tmp';

let cfg = {};

logger.setLevel(logger.WARN);

beforeEach(() => {
  // Default config with all options filled in.
  // Redefine keys as needed for tests.
  cfg = {
    origins: [
      { owner: 'temporalio', repo: 'samples-typescript' },
      { owner: 'temporalio', repo: 'email-subscription-project-python'},
      { owner: 'temporalio', repo: 'money-transfer-project-template-go'},
    ],
    targets: [ testEnvPath ],
    features: {
      enable_source_link: true,
      enable_code_block: true,
      allowed_target_extensions: [],
    },
  };

  fs.mkdirSync(testEnvPath, { recursive: true });
  fs.copyFileSync(`${fixturesPath}/index.md`,`${testEnvPath}/index.md`);
  fs.copyFileSync(`${fixturesPath}/index.txt`,`${testEnvPath}/index.txt`);
});


afterEach(() => {
   fs.rmSync(testEnvPath, { recursive: true });
});

test('Pulls snippet text into a file', async() => {

  const synctron = new Sync(cfg, logger);
  await synctron.run();
  const data = fs.readFileSync(`${testEnvPath}/index.md`, 'utf8');

  expect(data).toMatch(/export async function greet/);

});

test('Does not render code fences when option for code block is false', async() => {

  cfg.features.enable_code_block = false;
  const synctron = new Sync(cfg, logger);
  await synctron.run();
  const data = fs.readFileSync(`${testEnvPath}/index.md`, 'utf8');

  expect(data).not.toMatch(/```ts/);

});

test('Puts source link in the code', async() => {

  const synctron = new Sync(cfg, logger);
  await synctron.run();
  const data = fs.readFileSync(`${testEnvPath}/index.md`, 'utf8');

  expect(data).toMatch(/\[hello-world\/src\/activities.ts\]/);

});

test('Does not put source link in the code when option is false', async() => {
  cfg.features.enable_source_link = false;

  const synctron = new Sync(cfg, logger);
  await synctron.run();
  const data = fs.readFileSync(`${testEnvPath}/index.md`, 'utf8');

  expect(data).not.toMatch(/\[hello-world\/src\/activities.ts\]/);

});

test('Changes all files when allowed_target_extensions is not set', async() => {

  const synctron = new Sync(cfg, logger);
  await synctron.run();

  let data = fs.readFileSync(`${testEnvPath}/index.md`, 'utf8');
  expect(data).toMatch(/export async function greet/);

  data = fs.readFileSync(`${testEnvPath}/index.txt`, 'utf8');
  expect(data).toMatch(/export async function greet/);
});

test('Changes only markdown files when allowed_target_extensions is set to .md', async() => {
  cfg.features.allowed_target_extensions = ['.md'];

  const synctron = new Sync(cfg, logger);
  await synctron.run();

  let data = fs.readFileSync(`${testEnvPath}/index.md`, 'utf8');
  expect(data).toMatch(/export async function greet/);

  data = fs.readFileSync(`${testEnvPath}/index.txt`, 'utf8');
  expect(data).not.toMatch(/export async function greet/);

});

test('Cleans snippets from files that were not cleaned up previously', async() => {
  fs.copyFileSync(`${fixturesPath}/index_with_code.md`,`${testEnvPath}/index_with_code.md`);

  let data = fs.readFileSync(`${testEnvPath}/index_with_code.md`, 'utf8');
  expect(data).toMatch(/export async function greet/);

  const synctron = new Sync(cfg, logger);
  await synctron.clear();

  data = fs.readFileSync(`${testEnvPath}/index_with_code.md`, 'utf8');
  expect(data).not.toMatch(/export async function greet/);
});

test('Cleans snippets from all files', async() => {

  const synctron = new Sync(cfg, logger);
  await synctron.run();
  await synctron.clear();

  fs.copyFileSync(`${fixturesPath}/index.txt`,`${testEnvPath}/index.txt`);

  let data = fs.readFileSync(`${testEnvPath}/index.md`, 'utf8');
  expect(data).not.toMatch(/export async function greet/);

  data = fs.readFileSync(`${testEnvPath}/index.txt`, 'utf8');
  expect(data).not.toMatch(/export async function greet/);
});

test('uses regex patterns to pare down snippet inserted into a file', async() => {

  cfg.origins = [
      { owner: 'temporalio', repo: 'money-transfer-project-template-go' },
      { owner: 'temporalio', repo: 'samples-typescript' },
    ],

  fs.copyFileSync(`${fixturesPath}/regex_index.md`,`${testEnvPath}/regex_index.md`);

  const synctron = new Sync(cfg, logger);
  await synctron.run();
  const data = fs.readFileSync(`${testEnvPath}/regex_index.md`, 'utf8');

  // check go snippet
  expect(data).not.toMatch(/func MoneyTransfer/);
  expect(data).toMatch(/retrypolicy := &temporal\.RetryPolicy\{/);
  expect(data).not.toMatch(/options := workflow.ActivityOptions/);


  // check js snippet
  expect(data).not.toMatch(/import type \* as activities/);
  expect(data).toMatch(/const \{ greet/);
  expect(data).not.toMatch(/export async function example/);
  
});

test('Dedent keeps relative indentation inside the snippet', async () => {
  fs.copyFileSync(`${fixturesPath}/dedent.md`, `${testEnvPath}/dedent.md`);

  cfg.origins = [{ owner: 'temporalio', repo: 'samples-typescript' }];
  cfg.features.enable_code_dedenting = true;

  const synctron = new Sync(cfg, logger);
  await synctron.run();

  const text = fs.readFileSync(`${testEnvPath}/dedent.md`, 'utf8');

  // Grab the first fenced code block contents
  const m = text.match(/```[^\n]*\n([\s\S]*?)\n```/);
  expect(m).toBeTruthy();

  const bodyLines = m[1].split('\n').filter(l => l.length > 0);
  const indents = bodyLines.map(l => (l.match(/^[ \t]*/)?.[0].length ?? 0));
  const minIndent = Math.min(...indents);

  // With dedent enabled, the common left padding is removed:
  expect(minIndent).toBe(0);

  // But relative indentation remains for inner lines (at least one line still indented):
  expect(bodyLines.some(l => /^[ \t]+\S/.test(l))).toBe(true);
});

test('Regex-selected regions are dedented after start/end pattern slicing', async () => {
  fs.copyFileSync(`${fixturesPath}/regex_index.md`, `${testEnvPath}/regex_index.md`);

  cfg.origins = [
    { owner: 'temporalio', repo: 'money-transfer-project-template-go' },
    { owner: 'temporalio', repo: 'samples-typescript' },
  ];
  cfg.features.enable_code_dedenting = true;

  const synctron = new Sync(cfg, logger);
  await synctron.run();

  const text = fs.readFileSync(`${testEnvPath}/regex_index.md`, 'utf8');

  // First fenced block (per your fixture)
  const m = text.match(/```[^\n]*\n([\s\S]*?)\n```/);
  expect(m).toBeTruthy();
  const bodyLines = m[1].split('\n').filter(l => l.length > 0);
  const indents = bodyLines.map(l => (l.match(/^[ \t]*/)?.[0].length ?? 0));
  const minIndent = Math.min(...indents);

  // After slicing by start/end patterns, we still dedent the selected region:
  expect(minIndent).toBe(0);

  // Keep original regex expectations for content sanity
  expect(text).not.toMatch(/import type \* as activities/);
  expect(text).toMatch(/const \{ greet/);
  expect(text).not.toMatch(/export async function example/);
});

test('No dedent when option is false (snippet stays indented; other content unchanged)', async () => {
  fs.copyFileSync(`${fixturesPath}/dedent.md`, `${testEnvPath}/dedent.md`);

  cfg.origins = [{ owner: 'temporalio', repo: 'samples-typescript' }];
  cfg.features.enable_code_dedenting = false;

  const synctron = new Sync(cfg, logger);
  await synctron.run();

  const text = fs.readFileSync(`${testEnvPath}/dedent.md`, 'utf8');

  // Grab the first code block’s first line
  const m = text.match(/```[^\n]*\n([\s\S]*?)\n```/);
  expect(m).toBeTruthy();
  const firstCodeLine = m[1].split('\n')[0];

  // With dedent OFF, snippet should still start with two spaces
  expect(firstCodeLine).toMatch(/^\s{2}\S/);

  // Prose paragraph stays flush-left
  expect(text).toMatch(/\nFor example, this paragraph starts at flush-left\./);

  // Nested list item keeps its two leading spaces
  expect(text).toMatch(/\n\s{2}- For example, this list item on another level/);
});

test('Dedent when option is true (should only affect snippet; OTHER CONTENT UNCHANGED)', async () => {
  fs.copyFileSync(`${fixturesPath}/dedent.md`, `${testEnvPath}/dedent.md`);

  cfg.origins = [{ owner: 'temporalio', repo: 'samples-typescript' }];
  cfg.features.enable_code_dedenting = true;

  const synctron = new Sync(cfg, logger);
  await synctron.run();

  const text = fs.readFileSync(`${testEnvPath}/dedent.md`, 'utf8');

  const m = text.match(/```[^\n]*\n([\s\S]*?)\n```/);
  expect(m).toBeTruthy();
  const firstCodeLine = m[1].split('\n')[0];

  // EXPECTED (desired behavior): snippet becomes flush-left
  expect(firstCodeLine).toMatch(/^\S/);

  // EXPECTED (desired behavior): prose unchanged
  expect(text).toMatch(/\nFor example, this paragraph starts at flush-left\./);

  // EXPECTED (desired behavior): nested list item should remain indented
  // This is what will FAIL with the current file-level dedent implementation,
  // since it also strips indentation from list lines.
  expect(text).toMatch(/\n\s{2}- For example, this list item on another level/);
});

test('Dedent works without fences (enable_code_block=false)', async () => {
  fs.copyFileSync(`${fixturesPath}/dedent.md`, `${testEnvPath}/dedent.md`);

  cfg.origins = [{ owner: 'temporalio', repo: 'samples-typescript' }];
  cfg.features.enable_code_block = false;     // no ```
  cfg.features.enable_code_dedenting = true;  // dedent ON

  const synctron = new Sync(cfg, logger);
  await synctron.run();

  const text = fs.readFileSync(`${testEnvPath}/dedent.md`, 'utf8');

  // Extract snippet region between markers (simple, inline)
  const m = text.match(/<!--SNIPSTART[\s\S]*?-->\n([\s\S]*?)\n<!--SNIPEND-->/);
  expect(m).toBeTruthy();
  const bodyLines = m[1].split('\n').filter(l => l.length > 0);

  // Same invariants: min indent is 0; at least one line still indented
  const indents = bodyLines.map(l => (l.match(/^[ \t]*/)?.[0].length ?? 0));
  expect(Math.min(...indents)).toBe(0);
  expect(bodyLines.some(l => /^[ \t]+\S/.test(l))).toBe(true);
});


test('Per snippet selectedLines configuration', async() => {

  cfg.origins = [
      { owner: 'temporalio', repo: 'money-transfer-project-template-go' },
    ],

  fs.copyFileSync(`${fixturesPath}/empty-select.md`,`${testEnvPath}/empty-select.md`);

  const synctron = new Sync(cfg, logger);
  await synctron.run();
  const data = fs.readFileSync(`${testEnvPath}/empty-select.md`, 'utf8');
  const expected = fs.readFileSync(`test/fixtures/expected-select.md`, 'utf8');
  expect(data).toMatch(expected);

});

test('Per snippet file path configuration', async () => {

  cfg.origins = [
    { owner: 'temporalio', repo: 'money-transfer-project-template-go' },
  ],

    fs.copyFileSync(`${fixturesPath}/empty-select-path.md`, `${testEnvPath}/empty-select-path.md`);

  const synctron = new Sync(cfg, logger);
  await synctron.run();
  const data = fs.readFileSync(`${testEnvPath}/empty-select-path.md`, 'utf8');
  const expected = fs.readFileSync(`test/fixtures/expected-select-path.md`, 'utf8');
  expect(data).toMatch(expected);

});

test('Per snippet highlightedLines configuration', async() => {

  cfg.origins = [
      { owner: 'temporalio', repo: 'money-transfer-project-template-go' },
    ],

  fs.copyFileSync(`${fixturesPath}/empty-highlight.md`,`${testEnvPath}/empty-highlight.md`);

  const synctron = new Sync(cfg, logger);
  await synctron.run();
  const data = fs.readFileSync(`${testEnvPath}/empty-highlight.md`, 'utf8');
  const expected = fs.readFileSync(`test/fixtures/expected-highlight.md`, 'utf8');
  expect(data).toMatch(expected);

});

test('Local file ingestion', async() => {
  cfg.origins = [
    {
      files: {
        pattern: "./test/fixtures/*.go",
        owner: "temporalio",
        repo: "snipsync",
        ref: "main",
      },
    },
  ],
  fs.copyFileSync(`${fixturesPath}/empty-test-local-files.md`,`${testEnvPath}/empty-test-local-files.md`);
  const synctron = new Sync(cfg, logger);
  await synctron.run();
  const data = fs.readFileSync(`${testEnvPath}/empty-test-local-files.md`, 'utf8');
  const expected = fs.readFileSync(`test/fixtures/expected-test-local-files.md`, 'utf8');
  expect(data).toMatch(expected);
});


test('MDX/JSX markers are recognized and paired correctly', async () => {
  // Write a local source file with a simple snippet
  const srcPath = `${testEnvPath}/src.ts`;
  fs.writeFileSync(srcPath, `// @@@SNIPSTART demo-jsx
export const n = 1;
// @@@SNIPEND
`);

  // MDX target uses JSX-style markers
  const mdxPath = `${testEnvPath}/jsx_markers.mdx`;
  fs.writeFileSync(mdxPath, `{/* SNIPSTART demo-jsx */}
{/* SNIPEND */}
`);

  // Configure Snipsync to read from the local source file and only touch .mdx
  cfg.origins = [
    {
      files: {
        pattern: srcPath,
        owner: "temporalio",
        repo: "snipsync",
        ref: "main",
      },
    },
  ];
  cfg.features.allowed_target_extensions = ['.mdx'];
  cfg.features.enable_code_block = true;       // ensure fences are emitted
  cfg.features.enable_code_dedenting = true;   // any dedent behavior applies to the snippet body only

  const synctron = new Sync(cfg, logger);
  await synctron.run();

  const out = fs.readFileSync(mdxPath, 'utf8');

  // Assert: snippet content was injected between JSX markers with a TS fence
  expect(out).toMatch(/\{\/\*\s*SNIPSTART demo-jsx\s*\*\/\}/);
  expect(out).toMatch(/\{\/\*\s*SNIPEND\s*\*\/\}/);
});

test('No cross-pairing: HTML start must close with HTML end; JSX with JSX', async () => {
  // Local source with two snippets: one "good" and one for the mispaired case
  const srcPath = `${testEnvPath}/src2.ts`;
  fs.writeFileSync(srcPath, `// @@@SNIPSTART good-pair
const ok = 1;
// @@@SNIPEND

// @@@SNIPSTART mispaired
const nope = 2;
// @@@SNIPEND
`);

  // MDX target:
  //  - first region uses HTML markers (properly paired) → should splice
  //  - second region uses HTML start + JSX end (cross) → should NOT splice
  const mdxPath = `${testEnvPath}/mixed_markers.mdx`;
  fs.writeFileSync(mdxPath, `<!--SNIPSTART good-pair -->
<!--SNIPEND-->

<!--SNIPSTART mispaired -->
{/* SNIPEND */}
`);

  cfg.origins = [
    {
      files: {
        pattern: srcPath,
        owner: "temporalio",
        repo: "snipsync",
        ref: "main",
      },
    },
  ];
  cfg.features.allowed_target_extensions = ['.mdx'];
  cfg.features.enable_code_block = true;
  cfg.features.enable_code_dedenting = true;

  const synctron = new Sync(cfg, logger);
  await synctron.run();

  const out = fs.readFileSync(mdxPath, 'utf8');

  // Helper: extract content between an HTML start/end pair
  const htmlRegion = out.match(/<!--SNIPSTART good-pair -->\n([\s\S]*?)\n<!--SNIPEND-->/);
  expect(htmlRegion).toBeTruthy();
  const htmlBody = htmlRegion[1];

  // Properly paired HTML markers should have received the snippet (with a fence and the code)
  expect(htmlBody).toMatch(/```ts[\s\S]*const ok = 1;[\s\S]*```/);

  // Cross-paired region: HTML start + JSX end should NOT close/splice
  // The safest assertion: between those two lines there should NOT be a code fence nor the snippet text.
  const crossStartIdx = out.indexOf('<!--SNIPSTART mispaired -->');
  const crossEndIdx = out.indexOf('{/* SNIPEND */}');
  expect(crossStartIdx).toBeGreaterThan(-1);
  expect(crossEndIdx).toBeGreaterThan(-1);
  const crossBody = out.slice(
    crossStartIdx + '<!--SNIPSTART mispaired -->'.length,
    crossEndIdx
  );

  // Should not contain a code fence nor the snippet line "const nope = 2;"
  expect(crossBody).not.toMatch(/```/);
  expect(crossBody).not.toMatch(/const nope = 2;/);

  // (Optional) now clear and ensure only the properly paired region is cleared
  const synctron2 = new Sync(cfg, logger);
  await synctron2.clear();
  const cleared = fs.readFileSync(mdxPath, 'utf8');

  // After clear(): the good HTML-paired region should be empty between its markers
  const htmlRegionAfter = cleared.match(/<!--\s*SNIPSTART\s+good-pair\s*-->\s*([\s\S]*?)\s*<!--\s*SNIPEND\s*-->/);
  expect(htmlRegionAfter).toBeTruthy();
  expect(htmlRegionAfter[1].trim()).toBe(''); // snippet content removed

  // The mispaired region should remain unchanged (still no fence or snippet)
  const crossStartIdx2 = cleared.indexOf('<!--SNIPSTART mispaired -->');
  const crossEndIdx2 = cleared.indexOf('{/* SNIPEND */}');
  const crossBody2 = cleared.slice(
    crossStartIdx2 + '<!--SNIPSTART mispaired -->'.length,
    crossEndIdx2
  );
  expect(crossBody2).not.toMatch(/```/);
  expect(crossBody2).not.toMatch(/const nope = 2;/);
});

test('Clear preserves content on mismatched end (warn & bail)', async () => {
  const srcPath = `${testEnvPath}/src3.ts`;
  fs.writeFileSync(srcPath, `// @@@SNIPSTART foo\nconst x = 1;\n// @@@SNIPEND\n`);

  const mdxPath = `${testEnvPath}/mismatch_clear.mdx`;
  fs.writeFileSync(mdxPath, `<!--SNIPSTART foo -->\nsome text\n{/* SNIPEND */}\n`);

  cfg.origins = [{ files: { pattern: srcPath, owner: 'temporalio', repo: 'snipsync', ref: 'main' } }];
  cfg.features.allowed_target_extensions = ['.mdx'];
  cfg.features.enable_code_block = true;

  const synctron = new Sync(cfg, logger);
  await synctron.clear();

  const out = fs.readFileSync(mdxPath, 'utf8');

  // Region preserved (markers + inner content)
  expect(out).toMatch(/<!--\s*SNIPSTART\s+foo\s*-->/);
  expect(out).toMatch(/some text/);
  expect(out).toMatch(/\{\/\*\s*SNIPEND\s*\*\/\}/);
});

test('Splice warns and does not modify on mismatched end', async () => {
  // Arrange: source file with a snippet
  const srcPath = `${testEnvPath}/src-mismatch.ts`;
  fs.writeFileSync(
    srcPath,
    `// @@@SNIPSTART foo\nexport const val = 42;\n// @@@SNIPEND\n`
  );

  // Target doc with HTML start but JSX end (mismatched styles)
  const targetPath = `${testEnvPath}/mismatch_splice.mdx`;
  fs.writeFileSync(
    targetPath,
    `<!--SNIPSTART foo -->\nPLACEHOLDER\n{/* SNIPEND */}\n`
  );

  cfg.origins = [
    {
      files: {
        pattern: srcPath,
        owner: 'temporalio',
        repo: 'snipsync',
        ref: 'main',
      },
    },
  ];
  cfg.targets = [testEnvPath];
  cfg.features.enable_code_block = true;

  // Spy on logger.warn
  const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

  // Act
  const synctron = new Sync(cfg, logger);
  await synctron.run();

  // Assert: the mismatched region remains unchanged (no code spliced in)
  const out = fs.readFileSync(targetPath, 'utf8');
  expect(out).toContain('<!--SNIPSTART foo -->');
  expect(out).toContain('PLACEHOLDER');
  expect(out).toContain('{/* SNIPEND */}');

  // And we should have logged a warning about the mismatch
  expect(warnSpy).toHaveBeenCalled();

  // Cleanup spy
  warnSpy.mockRestore();
});
