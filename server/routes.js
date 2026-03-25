const express = require('express');
const router = express.Router();
const { generateTestCases } = require('./services/openaiService');
const { getProviderInfo }  = require('./services/llmProvider');
const { checkQuota, incrementQuota, getUsage } = require('./services/quotaService');
// ─── FEATURE: AUTOMATION_READY (Premium) ─────────────────────────────────────
// templateConverter replaces the GPT-4o re-call — instant, zero-latency exports
const { convertTestCases } = require('./services/automationReady/templateConverter');
const { generatePlaywright } = require('./services/automationReady/playwrightService');
const { generateCypress } = require('./services/automationReady/cypressService');
const { generatePostman } = require('./services/automationReady/postmanService');
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/generate-test-cases
router.post('/generate-test-cases', async (req, res) => {
  const { userStory, testTypes, testingTypes, count, format } = req.body;

  // --- Validation ---
  if (!userStory || typeof userStory !== 'string' || userStory.trim().length < 1 || userStory.length > 2000) {
    return res.status(400).json({ error: 'userStory is required and must be 1–2000 characters.' });
  }
  if (!Array.isArray(testTypes) || testTypes.length === 0) {
    return res.status(400).json({ error: 'At least one testType is required.' });
  }
  if (!Array.isArray(testingTypes) || testingTypes.length === 0) {
    return res.status(400).json({ error: 'At least one testingType is required.' });
  }
  if (![3, 5, 8, 10].includes(Number(count))) {
    return res.status(400).json({ error: 'count must be 3, 5, 8, or 10.' });
  }

  // --- Quota check ---
  // Identify user by IP address
  const userIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const quota = checkQuota(userIp);

  if (quota.exceeded) {
    return res.status(429).json({
      error: 'Daily quota exceeded. You can generate up to 5 test cases per day.',
      usage: quota
    });
  }

  try {
    // --- Call OpenAI ---
    const testCases = await generateTestCases({
      userStory: userStory.trim(),
      testTypes,
      testingTypes,
      count: Number(count),
      format: format || 'Standard'
    });

    // --- Increment quota after successful generation ---
    const updatedUsage = incrementQuota(userIp);

    return res.json({
      testCases,
      usage: updatedUsage
    });
  } catch (err) {
    console.error('Error generating test cases:', err.message);
    return res.status(500).json({ error: 'Failed to generate test cases. Please try again.' });
  }
});

// GET /api/usage
router.get('/usage', (req, res) => {
  const userIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const usage = getUsage(userIp);
  return res.json({ usage });
});

// GET /api/provider
// Returns which LLM provider and model are currently active.
// Change provider at any time by setting LLM_PROVIDER (and related env vars) — no code changes needed.
router.get('/provider', (req, res) => {
  try {
    return res.json(getProviderInfo());
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── FEATURE: AUTOMATION_READY (Premium) ─────────────────────────────────────
// Routes: POST /api/automation-ready/:tool
// To gate behind a paid plan, add an auth/subscription middleware before each handler.

function validateAutomationReadyBody(req, res) {
  const { testCases } = req.body;
  if (!Array.isArray(testCases) || testCases.length === 0) {
    res.status(400).json({ error: 'testCases array is required and must not be empty.' });
    return false;
  }
  return true;
}

// POST /api/automation-ready/playwright
// Pipeline: instant template converter → Playwright code generator (no AI call)
router.post('/automation-ready/playwright', (req, res) => {
  if (!validateAutomationReadyBody(req, res)) return;
  try {
    const tests = convertTestCases(req.body.testCases, 'playwright');
    const code  = generatePlaywright(tests);
    return res.json({ code });
  } catch (err) {
    console.error('[AUTOMATION_READY] Playwright error:', err.message);
    return res.status(500).json({ error: 'Failed to generate Playwright script.' });
  }
});

// POST /api/automation-ready/cypress
// Pipeline: instant template converter → Cypress code generator (no AI call)
router.post('/automation-ready/cypress', (req, res) => {
  if (!validateAutomationReadyBody(req, res)) return;
  try {
    const tests = convertTestCases(req.body.testCases, 'cypress');
    const code  = generateCypress(tests);
    return res.json({ code });
  } catch (err) {
    console.error('[AUTOMATION_READY] Cypress error:', err.message);
    return res.status(500).json({ error: 'Failed to generate Cypress script.' });
  }
});

// POST /api/automation-ready/postman
// Pipeline: instant template converter → Postman collection builder (no AI call)
router.post('/automation-ready/postman', (req, res) => {
  if (!validateAutomationReadyBody(req, res)) return;
  try {
    const tests = convertTestCases(req.body.testCases, 'postman');
    const code  = generatePostman(tests);
    return res.json({ code });
  } catch (err) {
    console.error('[AUTOMATION_READY] Postman error:', err.message);
    return res.status(500).json({ error: 'Failed to generate Postman collection.' });
  }
});

// ─── Feedback ─────────────────────────────────────────────────────────────────
const { saveFeedback } = require('./services/feedbackService');

// POST /api/feedback
router.post('/feedback', (req, res) => {
  const { rating, comment, context } = req.body;

  if (!rating || !['positive', 'negative'].includes(rating)) {
    return res.status(400).json({ error: 'rating must be "positive" or "negative".' });
  }

  if (comment && typeof comment !== 'string') {
    return res.status(400).json({ error: 'comment must be a string.' });
  }

  if (comment && comment.length > 500) {
    return res.status(400).json({ error: 'comment must be 500 characters or fewer.' });
  }

  const entry = saveFeedback({ rating, comment: comment || '', context: context || {} });
  return res.json({ success: true, id: entry.id });
});

// ─────────────────────────────────────────────────────────────────────────────

module.exports = router;
