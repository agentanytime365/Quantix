/**
 * Safely parse JSON from an AI response.
 * Handles:
 * - Raw JSON
 * - JSON wrapped in markdown code fences (```json ... ```)
 * - Partial/truncated responses (best effort)
 */
function safeParseJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim();

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Attempt to extract a JSON object using regex
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_2) {
        console.error('safeParseJSON: Could not parse extracted JSON block');
        return null;
      }
    }
    console.error('safeParseJSON: No JSON object found in response');
    return null;
  }
}

module.exports = { safeParseJSON };
