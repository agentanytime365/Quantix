const express = require('express');
const router = express.Router();
const multer = require('multer');
const { generateTestCases } = require('./services/openaiService');
const { getProviderInfo }  = require('./services/llmProvider');
const { checkQuota, incrementQuota, getUsage } = require('./services/quotaService');
// ─── FEATURE: CONTEXT ENRICHMENT ─────────────────────────────────────────────
const { processDocument }       = require('./services/context/documentProcessor');
const { analyzeImage }          = require('./services/context/imageAnalyzer');
const { buildContextFromText, buildContextFromImage, mergeContexts } = require('./services/context/contextBuilder');
const contextCache              = require('./services/context/contextCache');
// ─────────────────────────────────────────────────────────────────────────────
// ─── FEATURE: AUTOMATION_READY (Premium) ─────────────────────────────────────
// templateConverter replaces the GPT-4o re-call — instant, zero-latency exports
const { convertTestCases } = require('./services/automationReady/templateConverter');
const { generatePlaywright } = require('./services/automationReady/playwrightService');
const { generateCypress } = require('./services/automationReady/cypressService');
const { generatePostman } = require('./services/automationReady/postmanService');
// ─────────────────────────────────────────────────────────────────────────────

// ─── FEATURE: CONTEXT ENRICHMENT — POST /api/upload ──────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
    ];
    const ext = (file.originalname || '').toLowerCase();
    const extOk = ext.endsWith('.pdf') || ext.endsWith('.docx') || ext.endsWith('.txt') ||
                  ext.endsWith('.md')  || ext.endsWith('.png')  || ext.endsWith('.jpg') ||
                  ext.endsWith('.jpeg')|| ext.endsWith('.webp') || ext.endsWith('.gif');
    if (allowed.includes(file.mimetype) || extOk) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype || file.originalname}`));
    }
  }
});

router.post('/upload', upload.array('files', 3), async (req, res) => {
  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({ error: 'No files uploaded. Please attach at least one file.' });
  }

  const contexts = [];

  for (const file of files) {
    const { buffer, mimetype, originalname } = file;

    // ── Cache check ──────────────────────────────────────────────────────────
    const cached = contextCache.get(buffer);
    if (cached) {
      contexts.push(cached);
      continue;
    }

    try {
      const isImage = mimetype?.startsWith('image/') ||
        ['png','jpg','jpeg','webp','gif'].some(e => originalname?.toLowerCase().endsWith(`.${e}`));

      let ctx;

      if (isImage) {
        const imageAnalysis = await analyzeImage(buffer, mimetype);
        ctx = buildContextFromImage(imageAnalysis);
      } else {
        const { rawText } = await processDocument(buffer, mimetype, originalname);
        ctx = await buildContextFromText(rawText);
      }

      contextCache.set(buffer, ctx);
      contexts.push(ctx);
    } catch (err) {
      console.error(`[upload] Error processing "${originalname}":`, err.message);
      return res.status(422).json({
        error: `Could not process "${originalname}": ${err.message}`
      });
    }
  }

  const combined = mergeContexts(contexts);
  return res.json({ context: combined, fileCount: files.length });
});

// ─────────────────────────────────────────────────────────────────────────────

// POST /api/generate-test-cases
router.post('/generate-test-cases', async (req, res) => {
  const { userStory, testTypes, testingTypes, count, format, context } = req.body;

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
  // In proxied environments (Replit, Vercel, etc.) the real IP lives in various headers.
  // Fall back through the chain: CF-Connecting-IP → X-Real-IP → X-Forwarded-For → socket IP
  const userIp =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';

  const quota = checkQuota(userIp);

  if (quota.exceeded) {
    return res.status(429).json({
      error: `Daily quota exceeded. You can generate up to ${quota.limitPerDay} test suites per day.`,
      usage: quota
    });
  }

  try {
    // --- Call LLM (context from uploaded docs/images is optional) ---
    const testCases = await generateTestCases({
      userStory: userStory.trim(),
      testTypes,
      testingTypes,
      count: Number(count),
      format: format || 'Standard',
      context: context || null,
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
  const userIp =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';
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

// ─── Contact / Issue Reports ───────────────────────────────────────────────────
const { saveContactReport } = require('./services/contactService');
const { sendContactEmail }  = require('./services/emailService');

// POST /api/contact/feedback
router.post('/contact/feedback', (req, res) => {
  const { name, email, issueType, description, systemInfo, timestamp } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required.' });
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  const validTypes = ['bug', 'feature', 'performance', 'ui-ux', 'export', 'generation', 'other'];
  if (!issueType || !validTypes.includes(issueType)) {
    return res.status(400).json({ error: 'A valid issueType is required.' });
  }
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({ error: 'description must be at least 10 characters.' });
  }

  const entry = saveContactReport({ name: name.trim(), email: email.trim(), issueType, description: description.trim(), systemInfo, timestamp });

  // Send HTML email — non-blocking; log failure but don't break the response
  sendContactEmail(entry).catch((err) => {
    console.error('[EMAIL] Failed to send contact email:', err.message);
  });

  return res.json({ success: true, id: entry.id });
});

// ─────────────────────────────────────────────────────────────────────────────

module.exports = router;
