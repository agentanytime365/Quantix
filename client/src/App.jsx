import React, { useState, useEffect, useCallback } from 'react';
import ExpandableTestCases from './components/ExpandableTestCases';
import ContactUsModal from './components/ContactUsModal';
import TermsAndConditions from './components/TermsAndConditions';

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

const LOADER_MESSAGES = [
  'Analyzing user story…',
  'Identifying test scenarios…',
  'Generating structured steps…',
  'Applying coverage rules…',
  'Finalising test cases…',
];

function QuantixLoader() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADER_MESSAGES.length);
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="qloader-wrap">
      <div className="qloader-card">
        <div className="qloader-line" style={{ width: '100%' }} />
        <div className="qloader-line" style={{ width: '80%' }} />
        <div className="qloader-line" style={{ width: '60%' }} />
      </div>
      <p className="qloader-text">{LOADER_MESSAGES[msgIndex]}</p>
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
  const [automationReady, setAutomationReady] = useState(false);
  const [automationWasGenerated, setAutomationWasGenerated] = useState(false);
  const [exportLoading, setExportLoading] = useState(null);
  const [exportError, setExportError] = useState('');

  const [showJiraHelp, setShowJiraHelp] = useState(false);

  // ─── Context Enrichment state ─────────────────────────────────────────────
  const [uploadedFiles, setUploadedFiles]   = useState([]);   // { name, size, type }[]
  const [context, setContext]               = useState(null);  // structured context from backend
  const [uploadLoading, setUploadLoading]   = useState(false);
  const [uploadError, setUploadError]       = useState('');

  // ─── Feedback state ───────────────────────────────────────────────────────
  const [feedbackRating, setFeedbackRating]       = useState(null);
  const [feedbackComment, setFeedbackComment]     = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading]     = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('quantix-theme') || 'light');
  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('quantix-theme', next);
      return next;
    });
  };

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
        body: JSON.stringify({ userStory, testTypes, testingTypes, count, format, context })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          if (data.usage) setUsage(data.usage);
          const limit = data.usage ? data.usage.limitPerDay : 3;
          setError(`Daily quota exceeded. You can generate up to ${limit} test cases per day. Come back tomorrow!`);
        } else {
          setError(data.error || 'Something went wrong. Please try again.');
        }
        return;
      }

      setTestCases(data.testCases || []);
      setAutomationWasGenerated(automationReady);
      setActiveFormat(format);
      if (data.usage) setUsage(data.usage);

      // Reset feedback for the new batch
      setFeedbackRating(null);
      setFeedbackComment('');
      setFeedbackSubmitted(false);
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [userStory, testTypes, testingTypes, count, format, automationReady]);

  // ─── Context Enrichment handlers ──────────────────────────────────────────
  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const MAX_FILES = 3;
    const MAX_MB    = 5;
    const combined  = [...uploadedFiles, ...files].slice(0, MAX_FILES);

    for (const f of files) {
      if (f.size > MAX_MB * 1024 * 1024) {
        setUploadError(`"${f.name}" exceeds the 5 MB size limit.`);
        return;
      }
    }

    setUploadError('');
    setUploadLoading(true);

    const formData = new FormData();
    combined.forEach((f) => formData.append('files', f));

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Upload failed. Please try again.');
        return;
      }
      setUploadedFiles(combined);
      setContext(data.context);
    } catch {
      setUploadError('Network error during upload. Please try again.');
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  }, [uploadedFiles]);

  const handleRemoveFile = useCallback((index) => {
    const next = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(next);
    if (!next.length) setContext(null);
  }, [uploadedFiles]);

  const handleNewTestCase = useCallback(() => {
    setUserStory('');
    setTestTypes([]);
    setTestingTypes([]);
    setCount(3);
    setFormat('Gherkin');
    setUploadedFiles([]);
    setContext(null);
    setUploadError('');
    setTestCases([]);
    setUsage(null);
    setCopiedAll(false);
    setExportError('');
    setExportLoading(null);
    setError('');
    setFeedbackRating(null);
    setFeedbackComment('');
    setFeedbackSubmitted(false);
    setAutomationReady(false);
    setAutomationWasGenerated(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCopyAll = () => {
    copyToClipboard(allTestCasesToMarkdown(testCases), () => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  // FEATURE: AUTOMATION_READY (Premium)
  const handleExport = async (type) => {
    setExportError('');
    setExportLoading(type);
    const extensions = { playwright: '.spec.js', cypress: '.cy.js', postman: '.json' };
    const filenames = {
      playwright: 'quantix-playwright.spec.js',
      cypress: 'quantix-cypress.cy.js',
      postman: 'quantix-postman-collection.json'
    };
    try {
      const res = await fetch(`/api/automation-ready/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCases })
      });
      const data = await res.json();
      if (!res.ok) {
        setExportError(data.error || `Failed to export ${type} script.`);
        return;
      }
      const blob = new Blob([data.code], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenames[type];
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Network error during export. Please try again.');
    } finally {
      setExportLoading(null);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackRating) return;
    setFeedbackLoading(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: feedbackRating,
          comment: feedbackComment.trim(),
          context: { userStory, testTypes, testingTypes, count }
        })
      });
    } catch {
      // silent — feedback is best-effort
    } finally {
      setFeedbackLoading(false);
      setFeedbackSubmitted(true);
    }
  };

  const charCount = userStory.length;
  const charOver = charCount > 2000;

  return (
    <div className="app" data-theme={theme}>
      {/* ─── Header ─── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">Quantix</span>
          </div>
          <p className="header-tagline">AI-powered QA test case generation</p>
          <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
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

            {/* ─── Context Enrichment ─────────────────────────────────── */}
            <div className="context-panel">
              <div className="context-panel-header">
                <span className="context-panel-title">
                  ＋ Add files like BRD, Design docs or Screenshots
                </span>
                <span className="context-panel-hint">
                  Drag &amp; drop files or click to upload (PDF, DOCX, TXT, PNG, JPG)
                </span>
              </div>

              {/* Drop zone / file input */}
              {uploadedFiles.length < 3 && (
                <label className={`context-dropzone ${uploadLoading ? 'context-dropzone--loading' : ''}`}>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileUpload}
                    disabled={uploadLoading}
                    style={{ display: 'none' }}
                  />
                  {uploadLoading ? (
                    <span className="context-dropzone-text">
                      <span className="btn-spinner context-spinner" />
                      Analysing documents…
                    </span>
                  ) : (
                    <span className="context-dropzone-text">
                      <span className="context-upload-icon">⬆</span>
                      {uploadedFiles.length > 0
                        ? 'Add more files or replace existing'
                        : 'Drag & drop files or click to upload'}
                    </span>
                  )}
                </label>
              )}

              {/* File chips */}
              {uploadedFiles.length > 0 && (
                <div className="uploaded-files">
                  {uploadedFiles.map((f, i) => (
                    <div className="file-chip" key={`${f.name}-${i}`}>
                      <span className="file-icon">
                        {f.type?.startsWith('image/') ? '🖼️' : '📄'}
                      </span>
                      <span className="file-name" title={f.name}>{f.name}</span>
                      <span className="file-size">({(f.size / 1024).toFixed(0)} KB)</span>
                      <button onClick={() => handleRemoveFile(i)} title="Remove file">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Context ready indicator */}
              {context && !uploadLoading && (
                <div className="context-ready">
                  <span className="context-ready-dot" />
                  <span className="context-ready-text">
                    Context extracted — {context.flows?.length || 0} flows · {context.validations?.length || 0} validations · {context.edgeCases?.length || 0} edge cases identified
                  </span>
                </div>
              )}

              {/* Upload error */}
              {uploadError && (
                <div className="context-upload-error">⚠️ {uploadError}</div>
              )}
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

            {/* Automation Ready toggle */}
            <label className="automation-toggle">
              <div className={`toggle-switch ${automationReady ? 'toggle-on' : ''}`} onClick={() => setAutomationReady((v) => !v)}>
                <span className="toggle-knob" />
              </div>
              <div className="toggle-label">
                <span className="toggle-title">Automation Ready Output</span>
                <span className="toggle-desc">Optimises steps with selectors, actions, and test data hints for Playwright / Cypress / Postman export</span>
              </div>
            </label>

            {/* Usage badge */}
            <UsageBadge usage={usage} />

            {/* Error */}
            {error && (
              <div className="error-banner">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {/* New Test Case / reset button — shown when there is content to clear */}
            {(userStory.trim() || testCases.length > 0 || uploadedFiles.length > 0) && !loading && (
              <button className="btn-new-test btn-new-test--above-generate" onClick={handleNewTestCase}>
                + New Test Case
              </button>
            )}

            {/* Generate button */}
            <button
              className={`btn-generate ${loading || uploadLoading || quotaExceeded || charOver ? 'btn-disabled' : ''}`}
              onClick={handleGenerate}
              disabled={loading || uploadLoading || !!quotaExceeded || charOver}
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="btn-spinner" />
                  Working on it…
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
        {loading && <QuantixLoader />}

        {/* ─── Export & Integrations ─── */}
        {!loading && testCases.length > 0 && (
          <section className="export-section">
            <div className="export-header">
              <h2 className="export-title">Automation Ready</h2>
              <p className="export-desc">Download your test cases in multiple formats, including <strong>Jira (Zephyr) ready CSV for direct import</strong>, or generate automation scripts ready to drop into your project.</p>
              <p className="export-desc-sub" onClick={() => setShowJiraHelp(true)}>
                Need help importing into Jira? <span className="jira-help-icon">ⓘ</span>
              </p>
            </div>

            <div className={`export-groups ${automationReady && automationWasGenerated ? 'export-groups--split' : ''}`}>
              {/* Manual Export panel */}
              <div className="export-group">
                <p className="export-group-label">Manual Export</p>
                <div className="export-group-btns export-group-btns--col">
                  <button className="btn-export btn-export-manual btn-export--full" onClick={handleCopyAll}>
                    <span className="export-btn-icon">📋</span>
                    <span>{copiedAll ? 'Copied!' : 'Copy Markdown'}</span>
                  </button>
                  <button className="btn-export btn-export-manual btn-export--full" onClick={() => downloadCSV(testCases)}>
                    <span className="export-btn-icon">⬇</span>
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>

              {/* Automation Scripts panel — only when toggle was on at generation time */}
              {automationReady && automationWasGenerated && (
                <div className="export-group export-group--automation">
                  <p className="export-group-label">Automation Scripts</p>
                  <div className="export-group-btns export-group-btns--col">
                    <button
                      className={`btn-export btn-export-playwright btn-export--full btn-export--green ${exportLoading === 'playwright' ? 'btn-export-loading' : ''}`}
                      onClick={() => handleExport('playwright')}
                      disabled={!!exportLoading}
                    >
                      <span className="export-btn-icon">🎭</span>
                      <span>{exportLoading === 'playwright' ? 'Generating…' : 'Playwright'}</span>
                      <span className="export-ext">.spec.js</span>
                    </button>
                    <button
                      className={`btn-export btn-export-cypress btn-export--full btn-export--green ${exportLoading === 'cypress' ? 'btn-export-loading' : ''}`}
                      onClick={() => handleExport('cypress')}
                      disabled={!!exportLoading}
                    >
                      <span className="export-btn-icon">🌲</span>
                      <span>{exportLoading === 'cypress' ? 'Generating…' : 'Cypress'}</span>
                      <span className="export-ext">.cy.js</span>
                    </button>
                    <button
                      className={`btn-export btn-export-postman btn-export--full btn-export--green ${exportLoading === 'postman' ? 'btn-export-loading' : ''}`}
                      onClick={() => handleExport('postman')}
                      disabled={!!exportLoading}
                    >
                      <span className="export-btn-icon">📮</span>
                      <span>{exportLoading === 'postman' ? 'Generating…' : 'Postman'}</span>
                      <span className="export-ext">.json</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {exportError && (
              <div className="error-banner" style={{ marginTop: 12 }}>
                <span className="error-icon">⚠️</span>
                {exportError}
              </div>
            )}
          </section>
        )}

        {/* ─── Results ─── */}
        {!loading && testCases.length > 0 && (
          <section className="results-section">
            <div className="results-header">
              <div>
                <h2 className="results-title">Generated Test Cases</h2>
                <p className="results-count">{testCases.length} test case{testCases.length !== 1 ? 's' : ''} generated</p>
              </div>
              <button className="btn-new-test" onClick={handleNewTestCase} title="Reset everything and start fresh">
                + New Test Case
              </button>
            </div>

            <ExpandableTestCases testCases={testCases} isGherkin={activeFormat === 'Gherkin'} />
          </section>
        )}
      </main>

      {/* ─── Feedback Widget ─── */}
      {!loading && testCases.length > 0 && (
        <section className="feedback-section">
          {feedbackSubmitted ? (
            <div className="feedback-thanks">
              <span className="feedback-thanks-icon">✓</span>
              Thanks for your feedback!
            </div>
          ) : (
            <>
              <p className="feedback-prompt">Was this output helpful?</p>
              <div className="feedback-btns">
                <button
                  className={`feedback-vote ${feedbackRating === 'positive' ? 'feedback-vote--active-pos' : ''}`}
                  onClick={() => setFeedbackRating(feedbackRating === 'positive' ? null : 'positive')}
                >
                  👍 Yes
                </button>
                <button
                  className={`feedback-vote ${feedbackRating === 'negative' ? 'feedback-vote--active-neg' : ''}`}
                  onClick={() => setFeedbackRating(feedbackRating === 'negative' ? null : 'negative')}
                >
                  👎 No
                </button>
              </div>

              {feedbackRating && (
                <div className="feedback-detail">
                  <textarea
                    className="feedback-textarea"
                    placeholder="Tell us what could be improved (optional)"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                  <button
                    className="feedback-submit"
                    onClick={handleFeedbackSubmit}
                    disabled={feedbackLoading}
                  >
                    {feedbackLoading ? 'Submitting…' : 'Submit Feedback'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ─── Jira Help Modal ─── */}
      {showJiraHelp && (
        <div className="modal-overlay" onClick={() => setShowJiraHelp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Import Test Cases into Jira (Zephyr)</h2>
              <button className="modal-close" onClick={() => setShowJiraHelp(false)}>✕</button>
            </div>

            <div className="modal-body">
              <ol className="jira-steps">
                <li>Download the CSV from Quantix using the <strong>Download CSV</strong> button above.</li>
                <li>Go to your Jira project.</li>
                <li>Navigate to <strong>Zephyr → Test Cases</strong>.</li>
                <li>Click <strong>Import</strong> → Select CSV.</li>
                <li>Map the fields:
                  <ul className="jira-field-map">
                    <li><span className="field-tag">Summary</span> → Title</li>
                    <li><span className="field-tag">Step</span> → Step</li>
                    <li><span className="field-tag">Test Data</span> → Test Data</li>
                    <li><span className="field-tag">Expected Result</span> → Expected Result</li>
                  </ul>
                </li>
                <li>Run import and verify your test cases appear correctly.</li>
              </ol>

              <div className="jira-tips">
                <p className="jira-tips-title">Tips</p>
                <ul>
                  <li>Ensure there are no empty rows in the CSV before importing</li>
                  <li>Keep column headers consistent with Zephyr's expected format</li>
                  <li>Use UTF-8 encoding if special characters cause issues</li>
                </ul>
              </div>
            </div>

            <button className="btn-generate modal-confirm-btn" onClick={() => setShowJiraHelp(false)}>
              Got it
            </button>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Quantix &copy; {new Date().getFullYear()} — AI-powered QA for modern teams</p>
        <p style={{ marginTop: '6px' }}>
          <TermsAndConditions theme={theme} />
        </p>
      </footer>

      {/* Floating Contact Us button */}
      <div className="contact-fab-wrapper">
        <ContactUsModal />
      </div>
    </div>
  );
}
