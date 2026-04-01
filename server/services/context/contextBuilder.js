/**
 * contextBuilder.js
 * Converts raw document text or image analysis JSON into a compressed,
 * structured context object suitable for injection into the test-case
 * generation prompt.
 *
 * Output shape:
 * {
 *   summary:      string   — 2–4 sentence distillation
 *   keyEntities:  string[] — actors, modules, APIs, pages mentioned
 *   flows:        string[] — user / system flows identified
 *   validations:  string[] — business rules and validation constraints
 *   edgeCases:    string[] — boundary conditions or error scenarios found
 * }
 */

const { getClients } = require('../llmProvider');

const SUMMARISE_PROMPT = (rawText) => `You are a senior QA analyst.
Read the following document excerpt and extract structured QA context.
Return ONLY a strict JSON object — no markdown, no explanation:

{
  "summary": "2-4 sentence summary of what this document describes from a QA perspective",
  "keyEntities": ["list of key entities: modules, pages, APIs, user roles, data models"],
  "flows": ["list of user or system flows described in the document"],
  "validations": ["list of business rules, validations, or constraints mentioned"],
  "edgeCases": ["list of edge cases, error conditions, or boundary scenarios suggested by the document"]
}

DOCUMENT:
${rawText}`;

/**
 * Build structured context from raw document text (calls LLM to summarise).
 * @param {string} rawText
 * @returns {Promise<ContextObject>}
 */
async function buildContextFromText(rawText) {
  if (!rawText || rawText.trim().length === 0) {
    return _emptyContext('Empty document');
  }

  const { type, client, provider } = getClients();
  const prompt = SUMMARISE_PROMPT(rawText.slice(0, 12000));

  let rawResponse = '';

  try {
    if (type === 'anthropic') {
      const res = await client.messages.create({
        model: provider.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      rawResponse = res.content[0]?.text || '';
    } else {
      const opts = {
        model:       provider.model,
        max_tokens:  2048,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      };
      if (provider.supportsJsonMode) opts.response_format = { type: 'json_object' };
      const res = await client.chat.completions.create(opts);
      rawResponse = res.choices[0]?.message?.content || '';
    }
  } catch (err) {
    console.error('[contextBuilder] LLM summarise error:', err.message);
    return _fallbackContext(rawText);
  }

  const cleaned = rawResponse
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (_) {
    // Try extracting the outermost JSON object
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try { parsed = JSON.parse(cleaned.slice(start, end + 1)); } catch (_2) { /* ignore */ }
    }
  }

  if (!parsed || typeof parsed.summary !== 'string') {
    return _fallbackContext(rawText);
  }

  return {
    summary:     parsed.summary      || '',
    keyEntities: _toArray(parsed.keyEntities),
    flows:       _toArray(parsed.flows),
    validations: _toArray(parsed.validations),
    edgeCases:   _toArray(parsed.edgeCases),
  };
}

/**
 * Convert image analysis result (from imageAnalyzer) into the standard
 * context shape. No extra LLM call needed — data is already structured.
 * @param {object} imageAnalysis
 * @returns {ContextObject}
 */
function buildContextFromImage(imageAnalysis) {
  const { type, fields, buttons, flows, validations, notes } = imageAnalysis;

  const entities = [...fields, ...buttons].filter(Boolean);
  const summaryParts = [`Screen type: ${type}.`];
  if (fields.length)      summaryParts.push(`Input fields: ${fields.join(', ')}.`);
  if (buttons.length)     summaryParts.push(`Actions: ${buttons.join(', ')}.`);
  if (notes)              summaryParts.push(notes);

  return {
    summary:     summaryParts.join(' '),
    keyEntities: entities,
    flows:       flows       || [],
    validations: validations || [],
    edgeCases:   [],
  };
}

/**
 * Merge multiple context objects into one combined context.
 * @param {ContextObject[]} contexts
 * @returns {ContextObject}
 */
function mergeContexts(contexts) {
  if (!contexts.length) return _emptyContext('No files provided');

  const combined = {
    summary:     contexts.map((c) => c.summary).filter(Boolean).join(' '),
    keyEntities: _dedup(contexts.flatMap((c) => c.keyEntities)),
    flows:       _dedup(contexts.flatMap((c) => c.flows)),
    validations: _dedup(contexts.flatMap((c) => c.validations)),
    edgeCases:   _dedup(contexts.flatMap((c) => c.edgeCases)),
  };

  // Cap each array at 15 items to keep prompt size reasonable
  combined.keyEntities = combined.keyEntities.slice(0, 15);
  combined.flows       = combined.flows.slice(0, 10);
  combined.validations = combined.validations.slice(0, 12);
  combined.edgeCases   = combined.edgeCases.slice(0, 10);

  return combined;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _toArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string' && val) return [val];
  return [];
}

function _dedup(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function _emptyContext(reason) {
  return { summary: reason, keyEntities: [], flows: [], validations: [], edgeCases: [] };
}

function _fallbackContext(rawText) {
  // When LLM summarisation fails, return first 400 chars as a plain summary
  return {
    summary:     rawText.slice(0, 400).replace(/\s+/g, ' ').trim(),
    keyEntities: [],
    flows:       [],
    validations: [],
    edgeCases:   [],
  };
}

module.exports = { buildContextFromText, buildContextFromImage, mergeContexts };
