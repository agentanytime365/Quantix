/**
 * ExpandableTestCases — replaces the flat tc-grid with collapsible cards.
 * Each test case card collapses / expands its steps table on click.
 * Uses the existing CSS design system (var(--*) tokens, existing class names).
 */

import React, { useState, useCallback } from 'react';
import { ChevronDown, Copy, Check } from 'lucide-react';

// ── Local copies of the helpers that live in App.jsx ─────────────────────────
// (Avoids restructuring the whole module just to share these)

const GHERKIN_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But'];
const GHERKIN_KEYWORD_COLORS = {
  Given: '#a78bfa', When: '#60a5fa', Then: '#34d399', And: '#94a3b8', But: '#f87171',
};
const PRIORITY_COLORS = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };
const TYPE_COLORS    = { positive: 'type-positive', negative: 'type-negative', edge: 'type-edge' };

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function tcToMarkdown(tc) {
  const lines = [
    `## ${tc.id}: ${tc.title}`,
    `**Type:** ${tc.type}`,
    `**Priority:** ${tc.priority}`,
    `**Description:** ${tc.description || ''}`,
    '',
    '| # | Step | Test Data | Expected Result |',
    '|---|------|-----------|-----------------|',
    ...(tc.steps || []).map((s, i) => {
      const step     = typeof s === 'object' ? (s.step || '')           : s;
      const data     = typeof s === 'object' ? (s.testData || 'N/A')    : 'N/A';
      const expected = typeof s === 'object' ? (s.expectedResult || '') : '';
      return `| ${i + 1} | ${step} | ${data} | ${expected} |`;
    }),
  ];
  return lines.join('\n');
}

// ── Step renderer (Gherkin-aware) ─────────────────────────────────────────────

function StepText({ text }) {
  const kw = GHERKIN_KEYWORDS.find((k) => text.startsWith(k + ' ') || text === k);
  if (!kw) return <span>{text}</span>;
  return (
    <>
      <span className="gherkin-kw" style={{ color: GHERKIN_KEYWORD_COLORS[kw] }}>{kw}</span>
      {text.slice(kw.length)}
    </>
  );
}

// ── Single expandable card ────────────────────────────────────────────────────

function ExpandableCard({ tc, index, isGherkin }) {
  const [open, setOpen]       = useState(false);
  const [copied, setCopied]   = useState(false);

  const tcId = tc.id || `TC-${String(index + 1).padStart(3, '0')}`;

  const handleCopy = useCallback((e) => {
    e.stopPropagation(); // don't toggle expand
    copyText(tcToMarkdown(tc));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tc]);

  const stepCount = (tc.steps || []).length;

  return (
    <div className={`tc-card tc-card--expandable ${open ? 'tc-card--open' : ''}`}>

      {/* ── Clickable header ── */}
      <button
        className="tc-expand-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {/* Left: meta badges + title */}
        <div className="tc-expand-left">
          <div className="tc-card-meta">
            <span className="tc-id">{tcId}</span>
            <span className={`tc-badge ${PRIORITY_COLORS[tc.priority] || ''}`}>{tc.priority}</span>
            <span className={`tc-badge ${TYPE_COLORS[tc.type] || ''}`}>{tc.type}</span>
            {isGherkin && <span className="tc-badge tc-badge-gherkin">Gherkin BDD</span>}
            <span className="tc-step-count">{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
          </div>
          <h3 className="tc-title">{tc.title}</h3>
          {tc.testingTypes && tc.testingTypes.length > 0 && (
            <div className="tc-testing-types">
              {tc.testingTypes.map((t) => (
                <span key={t} className="tc-tag">{t.replace('_', ' ')}</span>
              ))}
            </div>
          )}
        </div>

        {/* Right: copy + chevron */}
        <div className="tc-expand-actions">
          <span
            role="button"
            className={`tc-copy-btn ${copied ? 'tc-copy-btn--done' : ''}`}
            onClick={handleCopy}
            title="Copy as Markdown"
          >
            {copied
              ? <><Check size={14} /> Copied</>
              : <><Copy size={14} /> Copy</>
            }
          </span>
          <ChevronDown
            size={18}
            className={`tc-chevron ${open ? 'tc-chevron--open' : ''}`}
          />
        </div>
      </button>

      {/* ── Collapsible steps body ── */}
      <div className={`tc-expand-body ${open ? 'tc-expand-body--open' : ''}`}>
        {tc.steps && tc.steps.length > 0 && (
          <div className="tc-section">
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
                    const stepText = typeof s === 'object' ? (s.step || '')           : s;
                    const testData = typeof s === 'object' ? (s.testData || 'N/A')    : 'N/A';
                    const expected = typeof s === 'object' ? (s.expectedResult || '') : '';
                    return (
                      <tr key={i}>
                        <td className="col-num">{i + 1}</td>
                        <td className="col-step"><StepText text={stepText} /></td>
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
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export default function ExpandableTestCases({ testCases, isGherkin }) {
  if (!testCases || testCases.length === 0) return null;

  return (
    <div className="tc-grid">
      {testCases.map((tc, i) => (
        <ExpandableCard
          key={tc.id || i}
          tc={tc}
          index={i}
          isGherkin={isGherkin}
        />
      ))}
    </div>
  );
}
