/**
 * Contact / issue report storage.
 * Appends each report to server/contact_logs.json in JSON Lines format.
 */

const fs   = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', '..', 'contact_logs.json');

function saveContactReport({ name, email, issueType, description, systemInfo, timestamp }) {
  const entry = {
    id:          `cr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name:        (name || '').slice(0, 100),
    email:       (email || '').slice(0, 200),
    issueType:   issueType || 'other',
    description: (description || '').slice(0, 2000),
    systemInfo:  systemInfo || null,
    timestamp:   timestamp || new Date().toISOString(),
    status:      'new',
    created_at:  new Date().toISOString(),
  };

  const line = JSON.stringify(entry) + '\n';

  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (err) {
    console.error('[CONTACT] Failed to write contact log:', err.message);
  }

  console.log(`[CONTACT] ${entry.issueType} | ${entry.name} <${entry.email}> | ${entry.created_at}`);
  return entry;
}

module.exports = { saveContactReport };
