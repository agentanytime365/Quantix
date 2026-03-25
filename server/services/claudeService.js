const Anthropic = require('@anthropic-ai/sdk');
const { safeParseJSON } = require('./parser');

// Lazily instantiate the Anthropic client so a missing key only fails on request
let anthropic = null;
function getClient() {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
    }
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

/**
 * Build the user prompt.
 * Uses explicit scenario-planning instructions to force uniqueness across all test cases.
 */
function buildPrompt({ userStory, testTypes, testingTypes, count, format }) {
  const testTypesStr = testTypes.join(', ');
  const testingTypesStr = testingTypes.join(', ');

  // Format-specific step instructions
  const formatInstructions = format === 'Gherkin'
    ? `STEP FORMAT — Gherkin BDD: Every step in the "steps" array MUST start with "Given", "When", "Then", "And", or "But". Example: ["Given the user is on the login page", "When the user submits valid credentials", "Then the system issues a session token and redirects to the dashboard"]. The "expectedResult" must also be a "Then" statement.`
    : `STEP FORMAT — Standard: Write "steps" as plain-English numbered actions (e.g. "Navigate to the login page", "Enter a valid email address"). "expectedResult" describes the outcome in plain English.`;

  // Uniqueness guidance per test type
  const uniquenessGuide = `
UNIQUENESS RULES — this is critical. Every test case must cover a DIFFERENT specific scenario:
- positive tests: vary the exact valid flow being verified (e.g. standard login, remember-me login, login after password reset, SSO login). Never repeat the same happy path.
- negative tests: each must target a DIFFERENT failure condition (e.g. wrong password, non-existent email, empty field, SQL injection, expired account, locked account, rate limit exceeded). Do NOT repeat similar error conditions.
- edge tests: each must cover a DIFFERENT boundary or unusual condition (e.g. minimum-length input, maximum-length input, special characters, Unicode, simultaneous requests, session expiry mid-flow, network timeout). Do NOT duplicate boundaries.
- No two test cases may share the same title, scenario, or test data combination.
- Distribute test cases across the requested test types: ${testTypesStr}. Balance coverage intelligently.`;

  return `You are generating ${count} test cases for the following user story. Every test case must be completely unique — covering a distinct scenario, distinct inputs, and a distinct expected outcome.

USER STORY:
${userStory}

Test types to include: ${testTypesStr}
Testing types (layer focus): ${testingTypesStr}
Output format: ${format}
Number of test cases: ${count}

${uniquenessGuide}

FIELD REQUIREMENTS — every test case must include ALL of these:
- id: sequential string, e.g. "TC-001"
- title: concise, specific, unique title describing exactly what scenario is being tested
- description: one sentence explaining what this test validates and why it is distinct from the others
- type: one of "positive", "negative", "edge"
- testingTypes: array using only "api", "frontend_ui", "backend_db" — choose those relevant to the scenario
- preconditions: string describing the required system state before the test (be specific, e.g. "User account exists and is active; user has not exceeded login attempt limit")
- steps: array of strings (see format instruction below)
- expectedResult: the specific observable outcome
- testData: array of strings with realistic, specific key-value pairs used in this test (e.g. ["email: attacker@evil.com", "payload: ' OR 1=1 --", "expected_http_status: 400"]). Each test case MUST have different testData values.
- priority: one of "low", "medium", "high"
- acceptanceCriteria: array of strings, each one a specific, measurable acceptance criterion that must be satisfied for this test case to pass. Criteria must be directly verifiable, scoped to this exact test scenario, and different from the expectedResult. Include 3-5 criteria per test case (e.g. ["The system returns HTTP 200 within 2 seconds", "A valid JWT session token is issued", "The user is redirected to /dashboard", "The dashboard displays the authenticated user's name"]).

${formatInstructions}

Return ONLY a valid JSON object with a "testCases" array. No markdown, no explanation, no extra text.

{
  "testCases": [
    {
      "id": "TC-001",
      "title": "Successful login with valid email and password",
      "description": "Verifies the standard happy-path login flow for a registered, active user.",
      "type": "positive",
      "testingTypes": ["api", "frontend_ui"],
      "preconditions": "User account exists with email user@example.com; account is active and not locked",
      "steps": ["Given the user is on the login page", "When the user enters 'user@example.com' and 'ValidPass@123'", "And clicks the Login button", "Then the system returns HTTP 200 with a session token", "And redirects the user to the dashboard"],
      "expectedResult": "Then the user is authenticated and lands on the dashboard with their profile visible",
      "testData": ["email: user@example.com", "password: ValidPass@123", "expected_status: 200", "expected_redirect: /dashboard"],
      "acceptanceCriteria": ["The system returns HTTP 200 within 2 seconds", "A valid JWT session token is issued and stored in the session", "The user is redirected to /dashboard", "The dashboard displays the authenticated user's full name and avatar"],
      "priority": "high"
    }
  ]
}`;
}

/**
 * Remove duplicate test cases by title (safety net for repeated AI output).
 */
function deduplicateTestCases(testCases) {
  const seen = new Set();
  return testCases.filter((tc) => {
    const key = (tc.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Generate test cases using Claude claude-sonnet-4-5.
 * @param {Object} params
 * @returns {Array} testCases
 */
async function generateTestCases(params) {
  const userPrompt = buildPrompt(params);

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    temperature: 0.5,
    system: 'You are a senior QA engineer named Quantix. You write high-quality, diverse, non-repetitive test cases. Each test case must cover a completely different scenario. You ALWAYS return valid JSON only — no markdown, no extra text.',
    messages: [
      { role: 'user', content: userPrompt }
    ]
  });

  // Extract text content from the Anthropic response
  const raw = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  // Safely parse the JSON response
  const parsed = safeParseJSON(raw);

  if (!parsed || !Array.isArray(parsed.testCases)) {
    throw new Error('Invalid response structure from Claude.');
  }

  return deduplicateTestCases(parsed.testCases);
}

module.exports = { generateTestCases };
