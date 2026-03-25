/**
 * FEATURE: AUTOMATION_READY (Premium)
 *
 * Instant (zero-AI) converter: transforms Quantix test case steps directly
 * into the same {action, selector, value, assertion} schema that the framework
 * generators (Playwright / Cypress / Postman) consume.
 *
 * No GPT-4o call — runs in < 5 ms regardless of test case count.
 */

// ─── Selector inference ───────────────────────────────────────────────────────

const SELECTOR_MAP = [
  [/\bemail\b/i,              '#email'],
  [/\bpassword\b/i,           '#password'],
  [/\busername\b/i,           '#username'],
  [/\bsearch\b/i,             '#search'],
  [/\bphone\b/i,              '#phone'],
  [/\bname\b/i,               '#name'],
  [/\bfirst.?name\b/i,        '#firstName'],
  [/\blast.?name\b/i,         '#lastName'],
  [/\baddress\b/i,            '#address'],
  [/\bcity\b/i,               '#city'],
  [/\bzip\b|\bpostal\b/i,     '#zip'],
  [/\bamount\b|\bprice\b/i,   '#amount'],
  [/\bnotes?\b|\bmessage\b/i, '#message'],
  [/\bsubmit\b|\bsave\b/i,    'button[type=submit]'],
  [/\blogin\s*button\b/i,     'button[type=submit]'],
  [/\bsign.?in\s*button\b/i,  'button[type=submit]'],
  [/\bregister\s*button\b/i,  'button[type=submit]'],
  [/\bconfirm\s*button\b/i,   'button[type=submit]'],
  [/\bcancel\b/i,             'button[type=button]'],
  [/\bbutton\b/i,             'button'],
  [/\blink\b/i,               'a'],
  [/\bcheckbox\b/i,           'input[type=checkbox]'],
  [/\bradio\b/i,              'input[type=radio]'],
  [/\bdropdown\b|\bselect\b/i,'select'],
  [/\btextarea\b/i,           'textarea'],
];

function inferSelector(text) {
  for (const [pattern, sel] of SELECTOR_MAP) {
    if (pattern.test(text)) return sel;
  }
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const skip  = new Set(['the','user','page','form','with','into','that','then',
                         'when','given','and','but','should','must','will']);
  const key   = words.find(w => !skip.has(w));
  return key ? `[data-testid="${key}"]` : null;
}

// ─── API endpoint inference ───────────────────────────────────────────────────

const ENDPOINT_MAP = [
  [/\blogin\b|\bsign.?in\b/i,                '/api/auth/login'],
  [/\blogout\b|\bsign.?out\b/i,              '/api/auth/logout'],
  [/\bregister\b|\bsign.?up\b|\bcreate.account\b/i, '/api/auth/register'],
  [/\bpassword.reset\b|\breset.password\b/i, '/api/auth/password-reset'],
  [/\bprofile\b|\bme\b/i,                    '/api/users/me'],
  [/\bpayment\b|\bcheckout\b/i,              '/api/payment'],
  [/\border\b/i,                             '/api/orders'],
  [/\bproduct\b/i,                           '/api/products'],
  [/\bcart\b/i,                              '/api/cart'],
  [/\bsearch\b/i,                            '/api/search'],
  [/\bupload\b/i,                            '/api/upload'],
  [/\bnotif/i,                               '/api/notifications'],
  [/\bsetting\b/i,                           '/api/settings'],
  [/\buser\b/i,                              '/api/users'],
];

function inferEndpoint(text) {
  for (const [pattern, ep] of ENDPOINT_MAP) {
    if (pattern.test(text)) return ep;
  }
  return '/api/resource';
}

function inferHttpMethod(text) {
  if (/\bdelete\b|\bremove\b/i.test(text)) return 'DELETE';
  if (/\bupdate\b|\bedit\b|\bmodify\b|\bput\b|\bpatch\b/i.test(text)) return 'PATCH';
  if (/\bfetch\b|\bget\b|\blist\b|\bview\b|\bread\b/i.test(text)) return 'GET';
  return 'POST';
}

// ─── Test data extraction ─────────────────────────────────────────────────────

function extractTestData(rawData) {
  if (!rawData || rawData === 'N/A' || rawData.trim() === '') return null;
  return rawData.trim();
}

// ─── Action classification ────────────────────────────────────────────────────

function classifyAction(stepText, framework) {
  // Strip Gherkin keywords so conjugated verbs (enters, clicks) still match
  const t = stepText.replace(/^(Given|When|Then|And|But)\s+/i, '').toLowerCase();

  // Patterns intentionally omit trailing \b to match conjugated forms
  // (navigates, enters, clicks, verifies, etc.)
  if (/\bnavigate|\bgo to\b|\bopen\b|\bvisit|\burl\b|\blaunch|\bbrowse/i.test(t))
    return 'navigate';

  if (/\benter|\btype|\bfill|\binput|\bprovide/i.test(t))
    return 'type';

  if (/\bselect|\bchoose|\bpick/i.test(t) &&
      !/\bselect.+option\b/i.test(t))
    return 'select';

  if (/\bclick|\bpress|\btap|\bsubmit|\bhit\b|\bpush/i.test(t))
    return 'click';

  if (/\bverif|assert|\bcheck|\bshould\b|\bexpect|\bconfirm|\bsee\b|\bdisplay|\bappear|\bvisible\b|\bshown\b/i.test(t))
    return 'assert';

  if (/\bapi\b|\brequest\b|\bresponse\b|\bstatus\b|\bendpoint\b|\bpost\b|\bget\b|\bpatch\b|\bdelete\b/i.test(t) &&
      framework === 'postman')
    return 'api_request';

  return 'assert';
}

// ─── URL extraction ───────────────────────────────────────────────────────────

function extractUrl(stepText, testData) {
  const urlPattern = /(?:url\s*[:=]\s*)?(\/?[a-z][\w/-]*)/i;

  const combined = `${stepText} ${testData || ''}`;
  const match = combined.match(/url\s*[:=]\s*([^\s,]+)/i) ||
                combined.match(/(?:go to|navigate to|visit|open)\s+([/][\w/-]+)/i);
  if (match) return match[1];

  return '/';
}

// ─── Single step converter ────────────────────────────────────────────────────

function convertStep(step, framework) {
  const { step: stepText, testData, expectedResult } = step;
  const td  = extractTestData(testData);
  const action = classifyAction(stepText, framework);

  if (action === 'navigate') {
    return {
      action: 'navigate',
      selector: null,
      value: extractUrl(stepText, testData),
      assertion: null,
    };
  }

  if (action === 'type') {
    return {
      action: 'type',
      selector: inferSelector(stepText),
      value: td || 'value',
      assertion: null,
    };
  }

  if (action === 'select') {
    return {
      action: 'select',
      selector: inferSelector(stepText),
      value: td || 'option',
      assertion: null,
    };
  }

  if (action === 'click') {
    return {
      action: 'click',
      selector: inferSelector(stepText),
      value: null,
      assertion: null,
    };
  }

  if (action === 'api_request') {
    const method = inferHttpMethod(stepText);
    return {
      action: 'api_request',
      selector: inferEndpoint(stepText),
      value: td || null,
      assertion: {
        type: 'status',
        expected: method === 'DELETE' ? '204' : '200',
      },
    };
  }

  // default → assert
  const selector = inferSelector(expectedResult || stepText);
  const assertType = /hidden|not.visible|absent|removed/i.test(stepText)
    ? 'hidden'
    : /contain|include|text/i.test(stepText)
    ? 'contains'
    : 'visible';

  return {
    action: 'assert',
    selector: selector || 'body',
    value: null,
    assertion: {
      type: assertType,
      expected: expectedResult || '',
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert Quantix test cases into the framework-generator-ready schema.
 * Mirrors the shape returned by aiAutomationService.generateAutomationSteps().
 *
 * @param {Array}  testCases  Raw Quantix test cases (from /api/generate-test-cases)
 * @param {string} framework  'playwright' | 'cypress' | 'postman'
 * @returns {Array}  tests[] — same schema the framework generators consume
 */
function convertTestCases(testCases, framework) {
  return testCases.map((tc) => ({
    title: tc.title || 'Untitled',
    framework,
    steps: (tc.steps || []).map((s) => convertStep(s, framework)),
  }));
}

module.exports = { convertTestCases };
