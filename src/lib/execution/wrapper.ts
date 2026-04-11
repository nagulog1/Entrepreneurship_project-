// ─── Code Wrapper Generator ──────────────────────────────────────────────────
// Generates test harness code per language that wraps the user's function,
// calls it with test case arguments, and prints results in a parseable format.

const CASE_SEPARATOR = '__CASE_SEP__';

export interface StructuredTestCase {
  args: unknown[];    // Parsed function arguments, e.g. [[2,7,11,15], 9]
  expected: string;   // Expected output as string, e.g. "[0,1]"
  display: string;    // Display label, e.g. "[2,7,11,15], 9"
}

// ─── Function name detection ─────────────────────────────────────────────────

export function detectFunctionName(code: string, language: string): string | null {
  // Try the specified language first, then try all patterns as fallback
  const result = detectForLanguage(code, language);
  if (result) return result;

  // Fallback: try all language patterns (handles language/code mismatch)
  const allLangs = ['JavaScript', 'Python', 'Java', 'C++'];
  for (const lang of allLangs) {
    if (lang === language) continue;
    const r = detectForLanguage(code, lang);
    if (r) return r;
  }
  return null;
}

function detectForLanguage(code: string, language: string): string | null {
  if (language === 'JavaScript' || language === 'TypeScript') {
    const m =
      code.match(/function\s+([a-zA-Z_$]\w*)\s*\(/) ??
      code.match(/(?:const|let|var)\s+([a-zA-Z_$]\w*)\s*=\s*(?:function|\()/);
    return m?.[1] ?? null;
  }

  if (language === 'Python') {
    const m = code.match(/def\s+([a-zA-Z_]\w*)\s*\(/);
    return m?.[1] ?? null;
  }

  if (language === 'Java') {
    const names: string[] = [];
    let m: RegExpExecArray | null;
    const re = /public\s+\w+(?:<[^>]+>)?\s+([a-zA-Z_]\w*)\s*\(/g;
    while ((m = re.exec(code)) !== null) {
      if (m[1] !== 'main') names.push(m[1]);
    }
    return names[0] ?? null;
  }

  if (language === 'C++' || language === 'C') {
    const m = code.match(/(?:int|void|bool|string|vector|float|double|long|char)(?:<[^>]*>)?\s+([a-zA-Z_]\w*)\s*\(/);
    return m?.[1] ?? null;
  }

  return null;
}

// ─── Test case input parser ──────────────────────────────────────────────────
// Converts "nums = [2,7,11,15], target = 9" → [[2,7,11,15], 9]

export function parseTestCaseInput(input: string): unknown[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // Check if it's already a JSON array of args (e.g. "[[2,7,11,15], 9]")
  if (trimmed.startsWith('[') && !trimmed.includes('=')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch { /* fall through */ }
  }

  // Parse "name = value, name2 = value2" format
  // Split on commas that are followed by a word + "="
  const parts = trimmed.split(/,\s*(?=[a-zA-Z_]\w*\s*=)/);
  const args: unknown[] = [];

  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) {
      // No "=", try parsing the whole thing as a value
      try { args.push(JSON.parse(part.trim())); } catch { args.push(part.trim()); }
      continue;
    }
    const value = part.substring(eqIdx + 1).trim();
    try { args.push(JSON.parse(value)); } catch { args.push(value); }
  }

  return args;
}

// ─── Output comparison ───────────────────────────────────────────────────────

export function compareOutput(expected: string, actual: string): boolean {
  const e = expected.trim();
  const a = actual.trim();
  if (e === a) return true;

  // Normalize JSON (handles spacing/ordering differences for arrays)
  try {
    return JSON.stringify(JSON.parse(e)) === JSON.stringify(JSON.parse(a));
  } catch {
    // Fall back to case-insensitive string comparison
    return e.toLowerCase() === a.toLowerCase();
  }
}

// ─── Wrapper generators ─────────────────────────────────────────────────────

export function wrapJavaScript(
  userCode: string,
  functionName: string,
  testCases: StructuredTestCase[]
): string {
  const casesJson = JSON.stringify(testCases.map((tc) => tc.args));

  return `${userCode}

// ═══ Auto-generated test harness ═══
;(function() {
  var __cases = ${casesJson};
  var __out = [];
  for (var __i = 0; __i < __cases.length; __i++) {
    try {
      var __r = ${functionName}.apply(null, __cases[__i]);
      __out.push(JSON.stringify(__r));
    } catch (__e) {
      __out.push("__ERR__:" + (__e && __e.message ? __e.message : String(__e)));
    }
  }
  console.log(__out.join("\\n${CASE_SEPARATOR}\\n"));
})();
`;
}

export function wrapPython(
  userCode: string,
  functionName: string,
  testCases: StructuredTestCase[]
): string {
  const casesJson = JSON.stringify(testCases.map((tc) => tc.args));

  return `import json

${userCode}

# === Auto-generated test harness ===
__cases = json.loads('${casesJson.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')
__out = []
for __tc in __cases:
    try:
        __r = ${functionName}(*__tc)
        __out.append(json.dumps(__r))
    except Exception as __e:
        __out.append(f"__ERR__:{__e}")
print("\\n${CASE_SEPARATOR}\\n".join(__out))
`;
}

export function wrapCode(
  userCode: string,
  language: string,
  functionName: string,
  testCases: StructuredTestCase[]
): string {
  switch (language) {
    case 'JavaScript':
    case 'TypeScript':
      return wrapJavaScript(userCode, functionName, testCases);
    case 'Python':
      return wrapPython(userCode, functionName, testCases);
    default:
      // For unsupported languages, just run the code as-is
      return userCode;
  }
}

// ─── Result parser ───────────────────────────────────────────────────────────
// Parses the combined stdout from wrapped code into per-case results.

export function parseExecutionOutput(
  stdout: string,
  testCases: StructuredTestCase[]
): Array<{ input: string; expected: string; got: string; pass: boolean }> {
  const parts = stdout.split(`\n${CASE_SEPARATOR}\n`);

  return testCases.map((tc, i) => {
    const raw = (parts[i] ?? '').trim();
    const isError = raw.startsWith('__ERR__:');

    if (isError) {
      return {
        input: tc.display,
        expected: tc.expected,
        got: `Error: ${raw.slice(8)}`,
        pass: false,
      };
    }

    return {
      input: tc.display,
      expected: tc.expected,
      got: raw,
      pass: compareOutput(tc.expected, raw),
    };
  });
}
