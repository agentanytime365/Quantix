// In-memory quota store: { ip: { count, date } }
const quotaStore = {};

const LIMIT_PER_DAY = 5;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Get current usage for a user IP.
 */
function getUsage(ip) {
  const today = getTodayKey();
  const record = quotaStore[ip];

  if (!record || record.date !== today) {
    return { usedToday: 0, limitPerDay: LIMIT_PER_DAY, exceeded: false };
  }

  return {
    usedToday: record.count,
    limitPerDay: LIMIT_PER_DAY,
    exceeded: record.count >= LIMIT_PER_DAY
  };
}

/**
 * Check if the user has exceeded their quota.
 */
function checkQuota(ip) {
  return getUsage(ip);
}

/**
 * Increment usage count for a user IP. Returns updated usage object.
 */
function incrementQuota(ip) {
  const today = getTodayKey();
  const record = quotaStore[ip];

  if (!record || record.date !== today) {
    quotaStore[ip] = { count: 1, date: today };
  } else {
    quotaStore[ip].count += 1;
  }

  const updated = quotaStore[ip];
  return {
    usedToday: updated.count,
    limitPerDay: LIMIT_PER_DAY,
    exceeded: updated.count >= LIMIT_PER_DAY
  };
}

module.exports = { checkQuota, incrementQuota, getUsage };
