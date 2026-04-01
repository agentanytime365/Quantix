/**
 * Email service — Gmail SMTP via Nodemailer.
 * Requires environment variables:
 *   GMAIL_USER      — sender Gmail address
 *   GMAIL_APP_PASS  — 16-char Gmail App Password (NOT the account password)
 *   CONTACT_EMAIL   — destination address for Contact Us reports
 */

const nodemailer = require('nodemailer');

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASS;

  if (!user || !pass) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASS must be set to send emails.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

// ── HTML email template ────────────────────────────────────────────────────

function issueTypeLabel(type) {
  const map = {
    bug:         '🐛 Bug Report',
    feature:     '✨ Feature Request',
    performance: '⚡ Performance Issue',
    'ui-ux':     '🎨 UI / UX Feedback',
    export:      '📤 Export Problem',
    generation:  '🧪 Test Generation Issue',
    other:       '💬 Other',
  };
  return map[type] || type;
}

function sysRow(label, value) {
  if (!value || value === 'Not available') return '';
  const display = typeof value === 'object' ? JSON.stringify(value, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') : value;
  return `
    <tr>
      <td style="padding:7px 12px;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;border-bottom:1px solid #f1f5f9;">${label}</td>
      <td style="padding:7px 12px;font-size:12px;color:#334155;border-bottom:1px solid #f1f5f9;word-break:break-word;">${display}</td>
    </tr>`;
}

function buildHtmlEmail(report) {
  const { name, email, issueType, description, systemInfo, id, created_at } = report;
  const si = systemInfo || {};
  const browserStr = si.browser ? `${si.browser.name} ${si.browser.version}` : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quantix — Contact Report</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:14px 14px 0 0;padding:28px 32px;text-align:left;">
            <span style="font-size:22px;font-weight:800;color:#14b8a6;letter-spacing:-0.5px;">⚡ Quantix</span>
            <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Contact Us — Issue Report</p>
          </td>
        </tr>

        <!-- Body card -->
        <tr>
          <td style="background:#ffffff;padding:28px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

            <!-- Issue type badge -->
            <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:999px;padding:5px 14px;font-size:12px;font-weight:700;color:#059669;margin-bottom:20px;">
              ${issueTypeLabel(issueType)}
            </div>

            <!-- Sender info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:20px;overflow:hidden;">
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;">
                  <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">From</span><br>
                  <span style="font-size:15px;font-weight:700;color:#0f172a;">${name}</span>
                  &nbsp;<a href="mailto:${email}" style="font-size:13px;color:#0891b2;text-decoration:none;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 16px;">
                  <span style="font-size:11px;font-weight:600;color:#94a3b8;">Report ID:</span>
                  <code style="font-size:11px;color:#64748b;margin-left:6px;">${id}</code>
                  &nbsp;&nbsp;
                  <span style="font-size:11px;font-weight:600;color:#94a3b8;">Submitted:</span>
                  <span style="font-size:11px;color:#64748b;margin-left:6px;">${new Date(created_at).toUTCString()}</span>
                </td>
              </tr>
            </table>

            <!-- Description -->
            <p style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Description</p>
            <div style="background:#f8fafc;border-left:3px solid #14b8a6;border-radius:0 8px 8px 0;padding:14px 18px;font-size:14px;color:#334155;line-height:1.65;margin-bottom:24px;white-space:pre-wrap;">${description}</div>

            ${si && Object.keys(si).length > 0 ? `
            <!-- System Info -->
            <p style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">System Diagnostics</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;font-family:monospace;margin-bottom:8px;">
              ${sysRow('Browser', browserStr)}
              ${sysRow('Screen', si.screenResolution)}
              ${sysRow('Timezone', si.timezone)}
              ${sysRow('Language', si.language)}
              ${sysRow('URL', si.url)}
              ${sysRow('Page Load', si.navigationTimings ? si.navigationTimings.pageLoadTime : null)}
              ${sysRow('DOM Ready', si.navigationTimings ? si.navigationTimings.domContentLoadTime : null)}
              ${sysRow('Memory Used', si.memoryUsage && si.memoryUsage.usedJSHeapSize ? si.memoryUsage.usedJSHeapSize : null)}
              ${sysRow('Memory Limit', si.memoryUsage && si.memoryUsage.jsHeapSizeLimit ? si.memoryUsage.jsHeapSizeLimit : null)}
            </table>
            ` : ''}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11.5px;color:#94a3b8;">
              This report was submitted via the Quantix Contact Us form.<br>
              Reply directly to <a href="mailto:${email}" style="color:#0891b2;">${email}</a> to respond to ${name}.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// ── Send function ─────────────────────────────────────────────────────────

async function sendContactEmail(report) {
  const to   = process.env.CONTACT_EMAIL || process.env.GMAIL_USER;
  const from = process.env.GMAIL_USER;

  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from:    `"Quantix Contact" <${from}>`,
    to,
    replyTo: report.email,
    subject: `[Quantix] ${issueTypeLabel(report.issueType)} from ${report.name}`,
    html:    buildHtmlEmail(report),
  });

  console.log(`[EMAIL] Sent contact report ${report.id} → ${to} (msgId: ${info.messageId})`);
  return info;
}

module.exports = { sendContactEmail };
