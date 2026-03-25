import React, { useState, useEffect, useCallback } from 'react';

// ─── Constants ──────────────────────────────────────────────────────────────

const TEST_TYPES = ['Positive', 'Negative', 'Edge'];
const TESTING_TYPES = [
  { label: 'API', value: 'api' },
  { label: 'Frontend UI', value: 'frontend_ui' },
  { label: 'Backend DB', value: 'backend_db' }
];
const COUNT_OPTIONS = [3, 5, 8, 10];
const FORMAT_OPTIONS = [
  { label: 'Standard', value: 'Standard' },
  { label: 'Gherkin (BDD)', value: 'Gherkin' }
];

const PRIORITY_COLORS = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };
const TYPE_COLORS = { positive: 'type-positive', negative: 'type-negative', edge: 'type-edge' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function testCaseToMarkdown(tc) {
  const lines = [
    `## ${tc.id}: ${tc.title}`,
    ``,
    `**Type:** ${tc.type}  `,
    `**Testing Types:** ${(tc.testingTypes || []).join(', ')}  `,
    `**Priority:** ${tc.priority}`,
    ``,
    `**Description:** ${tc.description}`,
    ``,
    `**Steps:**`,
    ``,
    `| # | Step | Test Data | Expected Result |`,
    `|---|------|-----------|-----------------|`,
  ];
  (tc.steps || []).forEach((s, i) => {
    const step = typeof s === 'object' ? s.step : s;
    const testData = typeof s === 'object' ? (s.testData || 'N/A') : 'N/A';
    const expected = typeof s === 'object' ? (s.expectedResult || '') : '';
    lines.push(`| ${i + 1} | ${step} | ${testData} | ${expected} |`);
  });
  return lines.join('\n');
}

function allTestCasesToMarkdown(testCases) {
  return testCases.map(testCaseToMarkdown).join('\n\n---\n\n');
}

function downloadCSV(testCases) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = ['Test Case ID', 'Title', 'Type', 'Testing Types', 'Priority', 'Description', 'Step #', 'Step', 'Test Data', 'Expected Result'];
  const rows = [];
  testCases.forEach((tc) => {
    (tc.steps || []).forEach((s, idx) => {
      const stepText = typeof s === 'object' ? (s.step || '') : s;
      const testData = typeof s === 'object' ? (s.testData || 'N/A') : 'N/A';
      const expectedResult = typeof s === 'object' ? (s.expectedResult || '') : '';
      rows.push([
        escape(tc.id),
        escape(tc.title),
        escape(tc.type),
        escape((tc.testingTypes || []).join(', ')),
        escape(tc.priority),
        escape(tc.description),
        escape(idx + 1),
        escape(stepText),
        escape(testData),
        escape(expectedResult),
      ]);
    });
  });
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quantix-test-cases.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function copyToClipboard(text, onSuccess) {
  navigator.clipboard.writeText(text).then(() => {
    if (onSuccess) onSuccess();
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <p className="spinner-text">Quantix is generating your test cases…</p>
    </div>
  );
}

function UsageBadge({ usage }) {
  if (!usage) return null;
  const { usedToday, limitPerDay } = usage;
  const pct = (usedToday / limitPerDay) * 100;
  const exceeded = usedToday >= limitPerDay;
  return (
    <div className={`usage-badge ${exceeded ? 'usage-exceeded' : ''}`}>
      <div className="usage-label">
        <span>{usedToday} of {limitPerDay} free generations used today</span>
        {exceeded && <span className="usage-limit-tag">Limit reached</span>}
      </div>
      <div className="usage-bar-bg">
        <div className="usage-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CheckboxGroup({ label, options, selected, onChange }) {
  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="checkbox-row">
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt.toLowerCase();
          const lbl = typeof opt === 'object' ? opt.label : opt;
          const checked = selected.includes(val);
          return (
            <button
              key={val}
              type="button"
              className={`chip ${checked ? 'chip-active' : ''}`}
              onClick={() => toggle(val)}
            >
              <span className={`chip-dot ${checked ? 'chip-dot-active' : ''}`} />
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const GHERKIN_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But'];
const GHERKIN_KEYWORD_COLORS = {
  Given: '#14b8a6', When: '#3b82f6', Then: '#10b981', And: '#94a3b8', But: '#f87171'
};

function GherkinStep({ step }) {
  const keyword = GHERKIN_KEYWORDS.find((k) => step.startsWith(k + ' ') || step === k);
  if (!keyword) return <li className="tc-step-gherkin">{step}</li>;
  const rest = step.slice(keyword.length);
  return (
    <li className="tc-step-gherkin">
      <span className="gherkin-kw" style={{ color: GHERKIN_KEYWORD_COLORS[keyword] }}>{keyword}</span>
      {rest}
    </li>
  );
}

function TestCaseCard({ tc, index, isGherkin }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(testCaseToMarkdown(tc), () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="tc-card">
      <div className="tc-card-header">
        <div className="tc-card-meta">
          <span className="tc-id">{tc.id || `TC-${String(index + 1).padStart(3, '0')}`}</span>
          <span className={`tc-badge ${PRIORITY_COLORS[tc.priority] || ''}`}>{tc.priority}</span>
          <span className={`tc-badge ${TYPE_COLORS[tc.type] || ''}`}>{tc.type}</span>
          {isGherkin && <span className="tc-badge tc-badge-gherkin">Gherkin BDD</span>}
        </div>
        <button className="btn-icon" onClick={handleCopy} title="Copy as Markdown">
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>

      <h3 className="tc-title">{tc.title}</h3>

      {tc.testingTypes && tc.testingTypes.length > 0 && (
        <div className="tc-testing-types">
          {tc.testingTypes.map((t) => (
            <span key={t} className="tc-tag">{t.replace('_', ' ')}</span>
          ))}
        </div>
      )}

      {tc.steps && tc.steps.length > 0 && (
        <div className="tc-section">
          <h4 className="tc-section-title">Steps</h4>
          <div className="tc-step-table-wrap">
            <table className="tc-step-table">
              <thead>
                <tr>
                  <th className="col-num">#</th>
                  <th className="col-step">Step</th>
                  <th className="col-data">Test Data</th>
                  <th className="col-result">Expected Result</th>
                </tr>
              </thead>
              <tbody>
                {tc.steps.map((s, i) => {
                  const stepText = typeof s === 'object' ? (s.step || '') : s;
                  const testData = typeof s === 'object' ? (s.testData || 'N/A') : 'N/A';
                  const expected = typeof s === 'object' ? (s.expectedResult || '') : '';
                  const keyword = GHERKIN_KEYWORDS.find((k) => stepText.startsWith(k + ' ') || stepText === k);
                  return (
                    <tr key={i}>
                      <td className="col-num">{i + 1}</td>
                      <td className="col-step">
                        {keyword ? (
                          <>
                            <span className="gherkin-kw" style={{ color: GHERKIN_KEYWORD_COLORS[keyword] }}>{keyword}</span>
                            {stepText.slice(keyword.length)}
                          </>
                        ) : stepText}
                      </td>
                      <td className="col-data">{testData}</td>
                      <td className="col-result">{expected}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [userStory, setUserStory] = useState('');
  const [testTypes, setTestTypes] = useState([]);
  const [testingTypes, setTestingTypes] = useState([]);
  const [count, setCount] = useState(3);
  const [format, setFormat] = useState('Gherkin');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testCases, setTestCases] = useState([]);
  const [activeFormat, setActiveFormat] = useState('Standard');
  const [usage, setUsage] = useState(null);

  const [copiedAll, setCopiedAll] = useState(false);

  // Fetch usage on mount
  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((data) => {
        if (data.usage) setUsage(data.usage);
      })
      .catch(() => {});
  }, []);

  const quotaExceeded = usage && usage.usedToday >= usage.limitPerDay;

  const handleGenerate = useCallback(async () => {
    setError('');
    if (!userStory.trim()) {
      setError('Please enter a user story before generating.');
      return;
    }
    if (testTypes.length === 0) {
      setError('Please select at least one test type.');
      return;
    }
    if (testingTypes.length === 0) {
      setError('Please select at least one testing type.');
      return;
    }

    setLoading(true);
    setTestCases([]);

    try {
      const res = await fetch('/api/generate-test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userStory, testTypes, testingTypes, count, format })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError('Daily quota exceeded. You can generate up to 5 test cases per day. Come back tomorrow!');
          if (data.usage) setUsage(data.usage);
        } else {
          setError(data.error || 'Something went wrong. Please try again.');
        }
        return;
      }

      setTestCases(data.testCases || []);
      setActiveFormat(format);
      if (data.usage) setUsage(data.usage);
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [userStory, testTypes, testingTypes, count, format]);

  const handleCopyAll = () => {
    copyToClipboard(allTestCasesToMarkdown(testCases), () => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  const charCount = userStory.length;
  const charOver = charCount > 2000;

  return (
    <div className="app">
      {/* ─── Header ─── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">Quantix</span>
          </div>
          <p className="header-tagline">AI-powered QA test case generation</p>
        </div>
      </header>

      <main className="main">
        {/* ─── Hero ─── */}
        <section className="hero">
          <h1 className="hero-title">Quantix</h1>
          <h2 className="hero-subtitle">AI-powered test case generation built for real-world QA</h2>
          <p className="hero-desc">
            Generate high quality test cases across API, Frontend UI's, and Backend DB with proper scenario coverage. Quantix removes manual effort and gives you consistent, ready to use test cases instantly.
          </p>
        </section>

        {/* ─── Form ─── */}
        <section className="form-section">
          <div className="form-card">
            {/* User Story */}
            <div className="field-group">
              <label className="field-label" htmlFor="userStory">
                User Story
                <span className={`char-count ${charOver ? 'char-over' : ''}`}>{charCount}/2000</span>
              </label>
              <textarea
                id="userStory"
                className={`textarea ${charOver ? 'textarea-error' : ''}`}
                placeholder="As a user, I want to log in with my email and password so that I can access my account..."
                value={userStory}
                onChange={(e) => setUserStory(e.target.value)}
                maxLength={2100}
                rows={5}
              />
            </div>

            {/* Test Types & Testing Types side-by-side on wide screens */}
            <div className="form-row">
              <CheckboxGroup
                label="Test Types"
                options={TEST_TYPES}
                selected={testTypes}
                onChange={setTestTypes}
              />
              <CheckboxGroup
                label="Testing Types"
                options={TESTING_TYPES}
                selected={testingTypes}
                onChange={setTestingTypes}
              />
            </div>

            {/* Count & Format */}
            <div className="form-row">
              <div className="field-group">
                <label className="field-label" htmlFor="count">Number of Test Cases</label>
                <select
                  id="count"
                  className="select"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                >
                  {COUNT_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="format">Output Format</label>
                <select
                  id="format"
                  className="select"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  {FORMAT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Usage badge */}
            <UsageBadge usage={usage} />

            {/* Error */}
            {error && (
              <div className="error-banner">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {/* Generate button */}
            <button
              className={`btn-generate ${loading || quotaExceeded || charOver ? 'btn-disabled' : ''}`}
              onClick={handleGenerate}
              disabled={loading || !!quotaExceeded || charOver}
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="btn-spinner" />
                  Generating…
                </span>
              ) : quotaExceeded ? (
                '🚫 Daily Limit Reached'
              ) : (
                '⚡ Generate Test Cases'
              )}
            </button>
          </div>
        </section>

        {/* ─── Loading ─── */}
        {loading && <Spinner />}

        {/* ─── Results ─── */}
        {!loading && testCases.length > 0 && (
          <section className="results-section">
            <div className="results-header">
              <div>
                <h2 className="results-title">Generated Test Cases</h2>
                <p className="results-count">{testCases.length} test case{testCases.length !== 1 ? 's' : ''} generated</p>
              </div>
              <div className="results-actions">
                <button className="btn-secondary" onClick={handleCopyAll}>
                  {copiedAll ? '✓ Copied!' : '📋 Copy All'}
                </button>
                <button className="btn-secondary" onClick={() => downloadCSV(testCases)}>
                  ⬇ Download CSV
                </button>
              </div>
            </div>

            <div className="tc-grid">
              {testCases.map((tc, i) => (
                <TestCaseCard key={tc.id || i} tc={tc} index={i} isGherkin={activeFormat === 'Gherkin'} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Quantix &copy; {new Date().getFullYear()} — AI-powered QA for modern teams</p>
      </footer>
    </div>
  );
}
