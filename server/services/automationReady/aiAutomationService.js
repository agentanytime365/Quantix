/**
 * FEATURE: AUTOMATION_READY (Premium)
 *
 * AI layer that converts Quantix test cases into structured, executable
 * automation steps using GPT-4o.
 *
 * Output schema per test:
 * {
 *   title, framework,
 *   steps: [{ action, selector, value, assertion: { type, expected } }]
 * }
 */

const OpenAI = require('openai');

let openai = null;
function getClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY environment variable is not set.');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

function buildPrompt(testCases, framework) {
  const frameworkRules = {
    playwright: `
- Use selectors like #id, .class, [data-testid="x"], button[type=submit]
- Navigation action uses URL paths (e.g. "/login")
- Assertions must map to Playwright expect() — use types: visible, hidden, contains, equals
- action values: navigate, click, type, select, assert`,

    cypress: `
- Use cy.get() compatible selectors: #id, .class, [data-cy="x"]
- Chainable actions
- action values: navigate, click, type, select, assert`,

    postman: `
- action must always be "api_request"
- selector = the API endpoint path (e.g. "/api/auth/login")
- value = JSON payload object as a string
- assertion.type must be "status" or "equals"
- Infer HTTP method from context (login/create → POST, fetch/list → GET, update → PUT, delete → DELETE)`
  };

  return `You are a senior QA automation engineer.

Convert the following QA test cases into automation-ready executable steps for ${framework}.

TEST CASES:
${JSON.stringify(testCases, null, 2)}

TARGET FRAMEWORK: ${framework}

GOAL:
Convert test cases into structured automation instructions.
DO NOT change: test case titles, descriptions, or number of test cases.

OUTPUT RULES:
Return ONLY a JSON object with this exact structure:
{
  "tests": [
    {
      "title": "string (same as input title)",
      "framework": "${framework}",
      "steps": [
        {
          "action": "navigate | click | type | select | assert | api_request",
          "selector": "CSS selector OR API endpoint OR null",
          "value": "input value OR JSON payload string OR null",
          "assertion": {
            "type": "visible | hidden | contains | equals | status",
            "expected": "expected value"
          }
        }
      ]
    }
  ]
}

Note: "assertion" is ONLY required when action is "assert" or "api_request". For all other actions, omit it or set it to null.

FRAMEWORK RULES for ${framework.toUpperCase()}:
${frameworkRules[framework] || ''}

INTELLIGENCE RULES — apply these without exception:
- Infer selectors from step meaning:
  "email field" → "#email"
  "password field" → "#password"
  "login button" or "submit button" → "button[type=submit]"
  "username" → "#username"
  "search input" → "#search"
  "dropdown" → "select"
  "checkbox" → "input[type=checkbox]"
  Generic: use [data-testid="descriptive-name"] when unsure
- Infer realistic test data:
  email fields → "test@example.com"
  password → "Password123!"
  username → "testuser"
  phone → "+1234567890"
  name → "John Doe"
  amount → "100.00"
- Infer API endpoints from context:
  login → "/api/auth/login"
  register → "/api/auth/register"
  payment → "/api/payment"
  user profile → "/api/users/me"
  product list → "/api/products"
- Replace ALL vague steps with concrete executable ones
- No TODO placeholders anywhere
- Every step must be immediately executable
- Return ONLY valid JSON — no markdown, no explanation`;
}

async function generateAutomationSteps(testCases, framework) {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a senior QA automation engineer. You convert QA test cases into structured, executable automation steps. Return ONLY valid JSON with the exact schema requested. No markdown. No explanation. No placeholders.'
      },
      {
        role: 'user',
        content: buildPrompt(testCases, framework)
      }
    ]
  });

  const raw = response.choices[0]?.message?.content || '';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI returned invalid JSON for automation steps.');
  }

  if (!parsed || !Array.isArray(parsed.tests)) {
    throw new Error('AI response missing "tests" array.');
  }

  return parsed.tests;
}

module.exports = { generateAutomationSteps };
