/**
 * Convert an array of test case objects into CSV format.
 * @param {Array} testCases
 * @returns {string} CSV string
 */
function generateCSV(testCases) {
  if (!Array.isArray(testCases) || testCases.length === 0) return '';

  const headers = ['ID', 'Title', 'Description', 'Type', 'Testing Types', 'Steps', 'Expected Result', 'Priority'];

  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = testCases.map((tc) => [
    escape(tc.id),
    escape(tc.title),
    escape(tc.description),
    escape(tc.type),
    escape(Array.isArray(tc.testingTypes) ? tc.testingTypes.join(', ') : tc.testingTypes),
    escape(Array.isArray(tc.steps) ? tc.steps.join(' | ') : tc.steps),
    escape(tc.expectedResult),
    escape(tc.priority)
  ]);

  const csvLines = [headers.map(escape).join(','), ...rows.map((r) => r.join(','))];
  return csvLines.join('\n');
}

module.exports = { generateCSV };
