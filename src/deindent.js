function commonIndentPrefix(lines) {
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) return "";

  // Optionally skip lines that are just a closing token
  const closingHead = /^(?:}|\]|\)|end\b)\s*$/;
  const candidates = nonEmpty.filter(l => !closingHead.test(l.trim()));
  const pool = candidates.length ? candidates : nonEmpty;

  // Compute common prefix of leading whitespace (tabs/spaces preserved)
  const prefixes = pool.map(l => (l.match(/^[\t ]*/)[0] || ""));
  let prefix = prefixes[0];
  for (let i = 1; i < prefixes.length; i++) {
    let j = 0;
    while (j < prefix.length && j < prefixes[i].length && prefix[j] === prefixes[i][j]) j++;
    prefix = prefix.slice(0, j);
    if (prefix === "") break;
  }
  return prefix;
}

function deindentByCommonPrefix(lines) {
  const prefix = commonIndentPrefix(lines);
  if (!prefix) return lines.slice();
  const re = new RegExp("^" + prefix.replace(/[\t ]/g, m => (m === "\t" ? "\\t" : " ")));
  return lines.map(l => (l.startsWith(prefix) ? l.replace(re, "") : l));
}

const SENSITIVE_INDENT_EXTS = new Set(['make', 'mk', 'Makefile', 'diff']);

module.exports = { deindentByCommonPrefix, SENSITIVE_INDENT_EXTS };
