const { getClients } = require('./llmProvider');
const { safeParseJSON } = require('./parser');

/**
 * Build the generation prompt.
 * Format-specific examples prevent the LLM from defaulting to one style.
 */
function buildContextSection(context) {
  if (!context || !context.summary) return '';

  const lines = [
    '',
    '─── CONTEXT FROM UPLOADED DOCUMENTS / IMAGES ───────────────────────────────',
    `Summary: ${context.summary}`,
  ];

  if (context.keyEntities?.length)
    lines.push(`Key entities: ${context.keyEntities.join(', ')}`);
  if (context.flows?.length)
    lines.push(`Flows:\n${context.flows.map((f) => `  • ${f}`).join('\n')}`);
  if (context.validations?.length)
    lines.push(`Validations:\n${context.validations.map((v) => `  • ${v}`).join('\n')}`);
  if (context.edgeCases?.length)
    lines.push(`Edge cases from docs:\n${context.edgeCases.map((e) => `  • ${e}`).join('\n')}`);

  lines.push('Use this context to make the test cases more specific and comprehensive.');
  lines.push('────────────────────────────────────────────────────────────────────────');

  return lines.join('\n');
}

function buildPrompt({ userStory, testTypes, testingTypes, count, format, context }) {
  const testTypesStr   = testTypes.join(', ');
  const testingTypesStr = testingTypes.join(', ');

  const formatInstructions = format === 'Gherkin'
    ? `STEP FORMAT — Gherkin BDD: Every step in the "steps" array MUST start with "Given", "When", "Then", "And", or "But". Example: ["Given the user is on the login page", "When the user submits valid credentials", "Then the system issues a session token and redirects to the dashboard"]. The "expectedResult" must also be a "Then" statement.`
    : `STEP FORMAT — Standard: Write "steps" as plain-English numbered actions (e.g. "Navigate to the login page", "Enter a valid email address"). "expectedResult" describes the outcome in plain English.`;

  const uniquenessGuide = `
UNIQUENESS RULES — this is critical. Every test case must cover a DIFFERENT specific scenario:
- positive tests: vary the exact valid flow being verified (e.g. standard login, remember-me login, login after password reset, SSO login). Never repeat the same happy path.
- negative tests: each must target a DIFFERENT failure condition (e.g. wrong password, non-existent email, empty field, SQL injection, expired account, locked account, rate limit exceeded). Do NOT repeat similar error conditions.
- edge tests: each must cover a DIFFERENT boundary or unusual condition (e.g. minimum-length input, maximum-length input, special characters, Unicode, simultaneous requests, session expiry mid-flow, network timeout). Do NOT duplicate boundaries.
- No two test cases may share the same title, scenario, or test data combination.
- Distribute test cases across the requested test types: ${testTypesStr}. Balance coverage intelligently.`;

  const exampleBlock = format === 'Gherkin' ? `{
  "testCases": [
    {
      "id": "TC-001",
      "title": "Successful login with valid credentials",
      "description": "Verifies the standard happy-path login flow for a registered user.",
      "type": "positive",
      "testingTypes": ["api", "frontend_ui"],
      "priority": "high",
      "steps": [
        { "step": "Given the user is on the login page", "testData": "URL: /login", "expectedResult": "Then the login form is displayed with email and password fields visible" },
        { "step": "When the user enters a valid email address", "testData": "email: user@example.com", "expectedResult": "Then the email field accepts the value without validation error" },
        { "step": "And the user enters a valid password", "testData": "password: ValidPass@123", "expectedResult": "Then the password field masks the input" },
        { "step": "And the user clicks the Login button", "testData": "N/A", "expectedResult": "Then POST /api/auth/login is called with correct credentials" },
        { "step": "Then the user is redirected to the dashboard", "testData": "expected_redirect: /dashboard", "expectedResult": "Then the dashboard page loads with the user's name displayed" }
      ]
    }
  ]
}` : `{
  "testCases": [
    {
      "id": "TC-001",
      "title": "Successful login with valid credentials",
      "description": "Verifies the standard happy-path login flow for a registered user.",
      "type": "positive",
      "testingTypes": ["api", "frontend_ui"],
      "priority": "high",
      "steps": [
        { "step": "Navigate to the login page", "testData": "URL: /login", "expectedResult": "Login form is displayed with email and password fields visible" },
        { "step": "Enter a valid email address in the email field", "testData": "email: user@example.com", "expectedResult": "Email field accepts the value without a validation error" },
        { "step": "Enter a valid password in the password field", "testData": "password: ValidPass@123", "expectedResult": "Password field masks the entered characters" },
        { "step": "Click the Login button", "testData": "N/A", "expectedResult": "POST /api/auth/login is called with the correct credentials" },
        { "step": "Verify the user is redirected to the dashboard", "testData": "expected_redirect: /dashboard", "expectedResult": "Dashboard page loads and displays the authenticated user's name" }
      ]
    }
  ]
}`;

  const contextSection = buildContextSection(context);

  return `You are generating ${count} test cases for the following user story. Every test case must be completely unique — covering a distinct scenario, distinct inputs, and a distinct expected outcome.

USER STORY:
${userStory}
${contextSection}
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
- priority: one of "low", "medium", "high"
- steps: array of step OBJECTS — NOT strings. Each object must have exactly three fields:
    • step: a clear, specific action (use Gherkin keywords if format is Gherkin: Given/When/Then/And/But)
    • testData: the specific input or data for this step only — be realistic and concrete (use "N/A" if not applicable)
    • expectedResult: the specific observable outcome of THIS individual step only

STEP RULES:
- Each step must represent ONE atomic action
- Do NOT include a top-level expectedResult — every expected result lives inside each step object
- testData must differ between steps where possible; use realistic values (e.g. "email: user@example.com")
- Minimum 3 steps, maximum 8 steps per test case

${formatInstructions}

Return ONLY a valid JSON object with a "testCases" array. No markdown, no explanation, no extra text.

${exampleBlock}`;
}

/**
 * Remove duplicate test cases by title (safety net).
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

const SYSTEM_PROMPT =
  'You are a senior QA engineer named Quantix. You write high-quality, diverse, non-repetitive test cases. Each test case must cover a completely different scenario. You ALWAYS return valid JSON only — no markdown, no extra text.';

/**
 * OpenAI-compatible path (Gemini, OpenAI, Azure, Groq, Ollama …)
 */
async function generateViaOpenAICompat(client, provider, userPrompt) {
  const requestOpts = {
    model:       provider.model,
    temperature: 0.5,
    max_tokens:  16000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userPrompt },
    ],
  };

  if (provider.supportsJsonMode) {
    requestOpts.response_format = { type: 'json_object' };
  }

  const response = await client.chat.completions.create(requestOpts);
  return response.choices[0]?.message?.content || '';
}

/**
 * Anthropic Claude path — uses native Messages API.
 */
async function generateViaAnthropic(client, provider, userPrompt) {
  const response = await client.messages.create({
    model:      provider.model,
    max_tokens: 16000,
    system:     SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });
  return response.content[0]?.text || '';
}

/**
 * Main entry — routes to the correct backend based on LLM_PROVIDER.
 */
async function generateTestCases(params) {
  const { type, client, provider } = getClients();
  const userPrompt = buildPrompt(params);

  let raw;
  if (type === 'anthropic') {
    raw = await generateViaAnthropic(client, provider, userPrompt);
  } else {
    raw = await generateViaOpenAICompat(client, provider, userPrompt);
  }

  const parsed = safeParseJSON(raw);

  if (!parsed || !Array.isArray(parsed.testCases)) {
    throw new Error(`Invalid response structure from ${provider.label}.`);
  }

  return deduplicateTestCases(parsed.testCases);
}

module.exports = { generateTestCases };
