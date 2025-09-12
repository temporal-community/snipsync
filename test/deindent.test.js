const { deindentByCommonPrefix, commonIndentPrefix } = require('../src/deindent');

describe('deindentByCommonPrefix', () => {
  test('strips common leading spaces from all lines', () => {
    const input = [
      '    foo();',
      '    bar();',
    ];
    const output = deindentByCommonPrefix(input);
    expect(output).toEqual(['foo();', 'bar();']);
  });

  test('preserves relative indentation inside the snippet', () => {
    const input = [
      '    if (x) {',
      '      doSomething();',
      '    }',
    ];
    const output = deindentByCommonPrefix(input);
    expect(output).toEqual([
      'if (x) {',
      '  doSomething();',
      '}',
    ]);
  });

  test('does not dedent when common indent is zero (hanging indent case)', () => {
    const input = [
      '  a++;',
      'b = a;',
    ];
    const output = deindentByCommonPrefix(input);
    // Nothing stripped
    expect(output).toEqual(input);
  });

  test('ignores closing-only head lines when computing indent', () => {
    const input = [
      '});',
      '  doSomething();',
    ];
    const output = deindentByCommonPrefix(input);
    expect(output).toEqual([
      '});',           // unchanged
      'doSomething();', // dedented
    ]);
  });

  test('handles empty lines gracefully', () => {
    const input = [
      '',
      '    foo();',
      '',
      '    bar();',
    ];
    const output = deindentByCommonPrefix(input);
    expect(output).toEqual([
      '',
      'foo();',
      '',
      'bar();',
    ]);
  });

  test('returns a shallow copy when there is nothing to dedent', () => {
    const input = ['foo();', 'bar();'];
    const output = deindentByCommonPrefix(input);
    expect(output).toEqual(input);
    expect(output).not.toBe(input); // new array, not the same reference
  });
});

describe('commonIndentPrefix', () => {
  test('computes the correct common indent', () => {
    const input = [
      '    foo();',
      '    bar();',
    ];
    expect(commonIndentPrefix(input)).toBe('    ');
  });

  test('returns empty string when lines have different starting indents and at least one substantive line is flush left', () => {
    const input = [
      '  foo();',
      'bar();',
    ];
    expect(commonIndentPrefix(input)).toBe('');
  });

  test('returns empty string for all-empty input', () => {
    expect(commonIndentPrefix([])).toBe('');
    expect(commonIndentPrefix(['', ''])).toBe('');
  });
});
