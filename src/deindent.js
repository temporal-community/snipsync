function commonIndentPrefix(lines) {
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) {return "";}

  // Treat lines that are only closing tokens (possibly multiple) as "closers".
  // Examples matched: "}", ")", "]", "});", "],", "})", "));", etc., with optional spaces.
  const CLOSING_ONLY = /^\s*[\])}]+(?:[;,])?\s*$/;
  const RUBY_END    = /^\s*end\b\s*$/;
  const isClosingOnly = (s) => CLOSING_ONLY.test(s) || RUBY_END.test(s);

  // Ignore closers when computing the common indent
  const pool = nonEmpty.filter(l => !isClosingOnly(l.trim()));
  const candidates = pool.length ? pool : nonEmpty;

  const prefixes = candidates.map(l => (l.match(/^[\t ]*/)?.[0] || ""));
  let prefix = prefixes[0] || "";
  for (let i = 1; i < prefixes.length; i++) {
    let j = 0;
    while (j < prefix.length && j < prefixes[i].length && prefix[j] === prefixes[i][j]) {j++;}
    prefix = prefix.slice(0, j);
    if (!prefix) {break;}
  }
  return prefix;
}

function deindentByCommonPrefix(lines) {
  const prefix = commonIndentPrefix(lines);
  if (!prefix) {
    return lines.slice();
  }
  const re = new RegExp("^" + prefix.replace(/[\t ]/g, m => (m === "\t" ? "\\t" : " ")));
  return lines.map(l => (l.startsWith(prefix) ? l.replace(re, "") : l));
}

// leadingWhitespace returns the tabs/spaces a line starts with, or "" for a
// line that starts at column 0 (or for no line at all).
function leadingWhitespace(line) {
  return (line || "").match(/^[\t ]*/)[0];
}

// indentBy prefixes every non-blank line with the given indent. Blank lines are
// left alone so we never introduce trailing whitespace.
//
// This exists because a SNIPSTART marker does not have to sit at column 0. In
// Markdown it can be nested inside a list item, and in MDX it can be nested
// inside a JSX element. Content written at column 0 under an indented marker
// ends the enclosing block: a fenced code block dropped at column 0 inside a
// list item closes the item, which at best renumbers the list and at worst
// leaves a JSX tag unclosed and fails the build.
function indentBy(lines, indent) {
  if (!indent) {
    return lines.slice();
  }
  return lines.map((l) => (l.trim().length === 0 ? l : indent + l));
}

const SENSITIVE_INDENT_EXTS = new Set(['make', 'mk', 'Makefile', 'diff']);

module.exports = {
  commonIndentPrefix,
  deindentByCommonPrefix,
  leadingWhitespace,
  indentBy,
  SENSITIVE_INDENT_EXTS,
};
