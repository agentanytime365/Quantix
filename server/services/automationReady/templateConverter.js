/**
 * FEATURE: AUTOMATION_READY (Premium)
 *
 * Instant (zero-AI) converter: transforms Quantix test case steps directly
 * into the same {action, selector, value, assertion} schema that the framework
 * generators (Playwright / Cypress / Postman) consume.
 *
 * No GPT-4o call — runs in < 5 ms regardless of test case count.
 */

// ─── Selector map ─────────────────────────────────────────────────────────────

const SELECTOR_DICT = {
  email:         '#email',
  password:      '#password',
  username:      '#username',
  search:        '#search',
  phone:         '#phone',
  name:          '#name',
  firstname:     '#firstName',
  lastname:      '#lastName',
  address:       '#address',
  city:          '#city',
  zip:           '#zip',
  postal:        '#zip',
  amount:        '#amount',
  price:         '#price',
  message:       '#message',
  notes:         '#notes',
  origin:        '#origin',
  destination:   '#destination',
  departuredate: '#departure-date',
  returndate:    '#return-date',
  passengers:    '#passengers',
  cardnumber:    '#card-number',
  card:          '#card-number',
  expiry:        '#expiry',
  cvv:           '#cvv',
  submit:        'button[type="submit"]',
  login:         'button[type="submit"]',
  register:      'button[type="submit"]',
  confirm:       'button[type="submit"]',
  cancel:        'button[type="button"]',
};

const SELECTOR_MAP = [
  [/\bemail\b/i,              '#email'],
  [/\bpassword\b/i,           '#password'],
  [/\busername\b/i,           '#username'],
  [/\bsearch\b/i,             '#search'],
  [/\bphone\b/i,              '#phone'],
  [/\bfirst.?name\b/i,        '#firstName'],
  [/\blast.?name\b/i,         '#lastName'],
  [/\bname\b/i,               '#name'],
  [/\baddress\b/i,            '#address'],
  [/\bcity\b/i,               '#city'],
  [/\bzip\b|\bpostal\b/i,     '#zip'],
  [/\bamount\b|\bprice\b/i,   '#amount'],
  [/\bnotes?\b|\bmessage\b/i, '#message'],
  [/\borigin\b/i,             '#origin'],
  [/\bdestination\b/i,        '#destination'],
  [/\bdeparture.?date\b/i,    '#departure-date'],
  [/\breturn.?date\b/i,       '#return-date'],
  [/\bpassengers?\b/i,        '#passengers'],
  [/\bcard.?number\b/i,       '#card-number'],
  [/\bexpiry\b|\bexpiration\b/i, '#expiry'],
  [/\bcvv\b|\bcvc\b/i,        '#cvv'],
  [/\bsubmit\b|\bsave\b/i,    'button[type="submit"]'],
  [/\blogin\s*button\b/i,     'button[type="submit"]'],
  [/\bsign.?in\s*button\b/i,  'button[type="submit"]'],
  [/\bregister\s*button\b/i,  'button[type="submit"]'],
  [/\bconfirm\s*button\b/i,   'button[type="submit"]'],
  [/\bcancel\b/i,             'button[type="button"]'],
  [/\bbutton\b/i,             'button'],
  [/\blink\b/i,               'a'],
  [/\bcheckbox\b/i,           'input[type="checkbox"]'],
  [/\bradio\b/i,              'input[type="radio"]'],
  [/\bdropdown\b|\bselect\b/i,'select'],
  [/\btextarea\b/i,           'textarea'],
];

/**
 * Map a single fieldName (key from parsed testData) to a CSS selector.
 * Normalises to lowercase, strips spaces, tries dict first then regex map.
 * Fallback: [name="fieldName"].
 */
function getSelector(fieldName) {
  const key = fieldName.toLowerCase().replace(/[\s_-]+/g, '');
  if (SELECTOR_DICT[key]) return SELECTOR_DICT[key];
  for (const [pattern, sel] of SELECTOR_MAP) {
    if (pattern.test(fieldName)) return sel;
  }
  return `[name="${fieldName}"]`;
}

function inferSelector(text) {
  for (const [pattern, sel] of SELECTOR_MAP) {
    if (pattern.test(text)) return sel;
  }
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const skip  = new Set(['the','user','page','form','with','into','that','then',
                         'when','given','and','but','should','must','will']);
  const key   = words.find(w => !skip.has(w));
  return key ? `[name="${key}"]` : null;
}

// ─── Test data parser ─────────────────────────────────────────────────────────

/**
 * Parse "key: value, key: value" string into a plain object.
 * Returns null if the string doesn't look like key:value pairs.
 *
 * Examples:
 *   "email: user@test.com, password: secret123"
 *   → { email: "user@test.com", password: "secret123" }
 */
function parseTestData(rawData) {
  if (!rawData || rawData === 'N/A' || rawData.trim() === '') return null;
  const trimmed = rawData.trim();

  // Only attempt parsing when we see at least one "word: something" pattern
  if (!/:/.test(trimmed)) return null;

  const result = {};
  // Split on commas that are followed by a key (word chars then colon)
  const parts = trimmed.split(/,\s*(?=[a-zA-Z_][\w\s]*:)/);
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;
    const k = part.slice(0, colonIdx).trim();
    const v = part.slice(colonIdx + 1).trim();
    if (k) result[k] = v;
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ─── API endpoint inference ───────────────────────────────────────────────────

const ENDPOINT_MAP = [
  [/\blogin\b|\bsign.?in\b/i,                            '/api/auth/login'],
  [/\blogout\b|\bsign.?out\b/i,                          '/api/auth/logout'],
  [/\bregister\b|\bsign.?up\b|\bcreate.account\b/i,      '/api/auth/register'],
  [/\bpassword.reset\b|\breset.password\b/i,             '/api/auth/password-reset'],
  [/\bprofile\b|\bme\b/i,                                '/api/users/me'],
  [/\bpayment\b|\bcheckout\b/i,                          '/api/payments'],
  [/\bbooking\b/i,                                       '/api/bookings'],
  [/\bflight.search\b|\bsearch.flight/i,                 '/api/flights/search'],
  [/\bflight\b/i,                                        '/api/flights'],
  [/\border\b/i,                                         '/api/orders'],
  [/\bproduct\b/i,                                       '/api/products'],
  [/\bcart\b/i,                                          '/api/cart'],
  [/\bsearch\b/i,                                        '/api/search'],
  [/\bupload\b/i,                                        '/api/upload'],
  [/\bnotif/i,                                           '/api/notifications'],
  [/\bsetting\b/i,                                       '/api/settings'],
  [/\buser\b/i,                                          '/api/users'],
];

function inferEndpoint(text) {
  for (const [pattern, ep] of ENDPOINT_MAP) {
    if (pattern.test(text)) return ep;
  }
  return '/api/resource';
}

function inferHttpMethod(text) {
  if (/\bdelete\b|\bremove\b/i.test(text))                          return 'DELETE';
  if (/\bupdate\b|\bedit\b|\bmodify\b|\bput\b|\bpatch\b/i.test(text)) return 'PATCH';
  if (/\bfetch\b|\bget\b|\blist\b|\bview\b|\bread\b|\bsearch\b/i.test(text)) return 'GET';
  return 'POST';
}

// ─── Assertion classifier ─────────────────────────────────────────────────────

/**
 * Return a structured assertion from the expected-result text.
 * Hierarchy: URL redirect → error/text contains → visibility.
 */
function classifyAssertion(expectedResult, stepText) {
  const combined = `${stepText || ''} ${expectedResult || ''}`.toLowerCase();

  if (/redirect|navigat|url|route|page/i.test(combined)) {
    // Try to extract a path from the text
    const pathMatch = (expectedResult || '').match(/(['"/])(\/[\w/-]+)\1/) ||
                      (expectedResult || '').match(/(\/[\w/-]+)/);
    return {
      type: 'url',
      expected: pathMatch ? pathMatch[pathMatch.length - 1] : '/dashboard',
    };
  }

  if (/error|invalid|fail|wrong|incorrect|reject|unauthori/i.test(combined)) {
    // Prefer an explicitly quoted message, otherwise use the full expected result
    const msgMatch = (expectedResult || '').match(/"([^"]+)"/) ||
                     (expectedResult || '').match(/'([^']+)'/);
    return {
      type: 'contains',
      expected: msgMatch ? msgMatch[1].trim() : (expectedResult || 'error'),
    };
  }

  if (/hidden|not.visible|absent|removed|disappear/i.test(combined)) {
    return { type: 'hidden', expected: expectedResult || '' };
  }

  if (/contain|include|text|show|display|visible|appear/i.test(combined)) {
    return { type: 'visible', expected: expectedResult || '' };
  }

  return { type: 'visible', expected: expectedResult || '' };
}

// ─── Action classification ────────────────────────────────────────────────────

function classifyAction(stepText, framework) {
  const t = stepText.replace(/^(Given|When|Then|And|But)\s+/i, '').toLowerCase();

  if (/\bnavigate|\bgo to\b|\bopen\b|\bvisit|\burl\b|\blaunch|\bbrowse/i.test(t))
    return 'navigate';
  if (/\benter|\btype|\bfill|\binput|\bprovide/i.test(t))
    return 'type';
  if (/\bselect|\bchoose|\bpick/i.test(t) && !/\bselect.+option\b/i.test(t))
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
  const combined = `${stepText} ${testData || ''}`;
  const match = combined.match(/url\s*[:=]\s*([^\s,]+)/i) ||
                combined.match(/(?:go to|navigate to|visit|open)\s+([/][\w/-]+)/i);
  if (match) return match[1];
  return '/';
}

// ─── Single step converter ────────────────────────────────────────────────────

function convertStep(step, framework) {
  const { step: stepText, testData, expectedResult } = step;
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
    const parsed = parseTestData(testData);
    if (parsed && Object.keys(parsed).length > 1) {
      // Multiple fields — return a multitype step so generators expand it
      return {
        action: 'multitype',
        fields: Object.entries(parsed).map(([k, v]) => ({
          selector: getSelector(k),
          value: v,
          label: k,
        })),
        assertion: null,
      };
    }
    // Single value
    return {
      action: 'type',
      selector: inferSelector(stepText),
      value: (parsed ? Object.values(parsed)[0] : testData) || 'value',
      assertion: null,
    };
  }

  if (action === 'select') {
    const parsed = parseTestData(testData);
    return {
      action: 'select',
      selector: inferSelector(stepText),
      value: (parsed ? Object.values(parsed)[0] : testData) || 'option',
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
      value: testData || null,
      assertion: {
        type: 'status',
        expected: method === 'DELETE' ? '204' : '200',
      },
    };
  }

  // default → assert
  const selector = inferSelector(expectedResult || stepText);
  const assertion = classifyAssertion(expectedResult, stepText);

  return {
    action: 'assert',
    selector: selector || 'body',
    value: null,
    assertion,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

function convertTestCases(testCases, framework) {
  return testCases.map((tc) => ({
    title: tc.title || 'Untitled',
    framework,
    steps: (tc.steps || []).map((s) => convertStep(s, framework)),
    // Carry raw test case data for Postman body inference
    _raw: tc,
  }));
}

module.exports = { convertTestCases, parseTestData, getSelector, inferEndpoint, inferHttpMethod };
