/**
 * Lightweight feedback storage.
 * Appends each entry to server/feedback_logs.json as a newline-delimited JSON
 * record (JSON Lines format). Easy to read, tail, and import later.
 */

const fs   = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', '..', 'feedback_logs.json');

function saveFeedback({ rating, comment, context }) {
  const entry = {
    id:         `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    rating,
    comment:    comment || '',
    user_story: (context && context.userStory) ? context.userStory.slice(0, 500) : '',
    context:    context || {},
    created_at: new Date().toISOString(),
  };

  const line = JSON.stringify(entry) + '\n';

  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (err) {
    console.error('[FEEDBACK] Failed to write feedback log:', err.message);
  }

  console.log(`[FEEDBACK] ${entry.rating} | "${entry.comment.slice(0, 80)}" | ${entry.created_at}`);
  return entry;
}

module.exports = { saveFeedback };
