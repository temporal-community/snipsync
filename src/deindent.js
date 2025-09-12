function commonIndentPrefix(lines) {
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) return "";

  // Treat lines that are only closing tokens (possibly multiple) as "closers".
  // Examples matched: "}", ")", "]", "});", "],", "})", "));", etc., with optional spaces.
  const CLOSING_ONLY = /^\s*[\]\)}]+(?:[;,])?\s*$/;
  const RUBY_END    = /^\s*end\b\s*$/;
  const isClosingOnly = (s) => CLOSING_ONLY.test(s) || RUBY_END.test(s);

  // Ignore closers when computing the common indent
  const pool = nonEmpty.filter(l => !isClosingOnly(l.trim()));
  const candidates = pool.length ? pool : nonEmpty;

  const prefixes = candidates.map(l => (l.match(/^[\t ]*/)?.[0] || ""));
  let prefix = prefixes[0] || "";
  for (let i = 1; i < prefixes.length; i++) {
    let j = 0;
    while (j < prefix.length && j < prefixes[i].length && prefix[j] === prefixes[i][j]) j++;
    prefix = prefix.slice(0, j);
    if (!prefix) break;
  }
  return prefix;
}

function deindentByCommonPrefix(lines) {
  const prefix = commonIndentPrefix(lines);
  if (!prefix) {return lines.slice();}
  const re = new RegExp("^" + prefix.replace(/[\t ]/g, m => (m === "\t" ? "\\t" : " ")));
  return lines.map(l => (l.startsWith(prefix) ? l.replace(re, "") : l));
}

const SENSITIVE_INDENT_EXTS = new Set(['make', 'mk', 'Makefile', 'diff']);

module.exports = { commonIndentPrefix, deindentByCommonPrefix, SENSITIVE_INDENT_EXTS };
