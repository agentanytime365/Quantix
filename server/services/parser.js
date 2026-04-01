/**
 * Safely parse JSON from an AI response.
 * Handles:
 * - Raw JSON
 * - JSON wrapped in markdown code fences (```json ... ```)
 * - Responses prefixed with <thinking> blocks (Gemini 2.5 / thinking models)
 * - Truncated / partially-formed JSON (best-effort recovery)
 */
function safeParseJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim();

  // Strip <thinking>...</thinking> blocks produced by Gemini thinking models
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Find the outermost JSON object using first { and last }
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      const candidate = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch (_2) {
        // Last resort: attempt truncated JSON repair
        const repaired = repairTruncatedJSON(candidate);
        if (repaired) return repaired;
        console.error('safeParseJSON: Could not parse extracted JSON block');
        console.error('safeParseJSON: Raw preview:', raw.slice(0, 400));
        return null;
      }
    }
    console.error('safeParseJSON: No JSON object found in response');
    console.error('safeParseJSON: Raw preview:', raw.slice(0, 400));
    return null;
  }
}

/**
 * Attempt to recover a truncated JSON response by closing open arrays/objects.
 * Finds the last fully-closed test case object and wraps correctly.
 * Returns a parsed object or null.
 */
function repairTruncatedJSON(partial) {
  try {
    const testCasesMatch = partial.match(/"testCases"\s*:\s*\[/);
    if (!testCasesMatch) return null;

    const arrayStart = partial.indexOf('[', testCasesMatch.index);
    if (arrayStart === -1) return null;

    // Walk through to find the last completely-closed top-level object
    let depth = 0;
    let lastCompleteEnd = -1;
    for (let i = arrayStart + 1; i < partial.length; i++) {
      if (partial[i] === '{') depth++;
      if (partial[i] === '}') {
        depth--;
        if (depth === 0) lastCompleteEnd = i;
      }
    }

    if (lastCompleteEnd === -1) return null;

    const repaired =
      partial.slice(0, arrayStart + 1) +
      partial.slice(arrayStart + 1, lastCompleteEnd + 1) +
      ']}';
    return JSON.parse(repaired);
  } catch (_) {
    return null;
  }
}

module.exports = { safeParseJSON };
