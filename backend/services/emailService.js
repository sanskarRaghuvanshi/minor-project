import { getTransporter, getFromAddress, isEmailConfigured } from '../config/nodemailer.js';
import logger from '../config/logger.js';

const parseFrom = (from) => {
  const match = String(from || '').match(/^(.*?)<(.+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: String(from || '').trim() };
};

const sendViaBrevo = async ({ from, to, subject, html }) => {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: parseFrom(from),
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
  return res.json();
};

const sendMail = async ({ from, to, subject, html }) => {
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo({ from, to, subject, html });
  }
  return getTransporter().sendMail({ from, to, subject, html });
};


const generateDefaulterEmailHtml = ({
  studentName,
  subjects,
  percentage,
  neededFor75,
  clientUrl,
}) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Attendance Alert</title></head>
<body style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="background: #ef4444; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 1.5rem;">Attendance Warning</h1>
  </div>
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: 0; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <p>Dear <strong>${studentName}</strong>,</p>
    <p>Your current attendance percentage is <strong style="color: #ef4444;">${percentage}%</strong>.</p>
    <p>You are below the required 75% threshold for the following subject(s):</p>
    <ul>
      ${subjects.map((s) => `<li><strong>${s.subject}</strong>: ${s.percentage}% (need ${s.needed} more classes to reach 75%)</li>`).join('')}
    </ul>
    <p>Total needed consecutive classes: <strong>${neededFor75}</strong></p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${clientUrl}/student/my-attendance" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Attendance</a>
    </div>
    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="color: #64748b; font-size: 0.875rem;">If you have any questions, please contact your faculty advisor.</p>
    <p style="color: #94a3b8; font-size: 0.75rem; text-align: center; margin-top: 16px;">Smart Attendance System</p>
  </div>
</body>
</html>`;

export const sendDefaulterEmail = async ({ to, subject: subjectLine, html }) => {
  if (!isEmailConfigured()) {
    logger.warn({
      level: 'warn',
      type: 'email_fallback',
      recipients: [to],
      subject: subjectLine,
      htmlLength: html?.length,
    }, 'SMTP not configured, email not sent');
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    const from = getFromAddress();

    await sendMail({
      from,
      to,
      subject: subjectLine || 'Attendance Warning',
      html,
    });

    logger.info({ to, subject: subjectLine }, 'Defaulter email sent');
    return { sent: true };
  } catch (err) {
    logger.error({ error: err.message, stack: err.stack, to, code: err.code, command: err.command }, 'Defaulter email failed');
    return { sent: false, reason: err.message };
  }
};

export const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const subject = 'Password Reset - Smart Attendance';
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Password Reset</title></head>
<body style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="background: #4f46e5; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 1.5rem;">Password Reset</h1>
  </div>
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: 0; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <p>You requested a password reset.</p>
    <p>Click the button below to reset your password. This link is valid for 10 minutes.</p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
    </div>
    <p style="margin-top: 24px;">If you didn't request this, please ignore this email.</p>
    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="color: #94a3b8; font-size: 0.75rem; text-align: center;">Smart Attendance System</p>
  </div>
</body>
</html>`;

  if (!isEmailConfigured()) {
    logger.warn({ type: 'email_fallback', recipients: [to], subject }, 'SMTP not configured, password reset email not sent');
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    const from = getFromAddress();
    await sendMail({ from, to, subject, html });
    logger.info({ to, subject }, 'Password reset email sent');
    return { sent: true };
  } catch (err) {
    logger.error('Password reset email failed', { error: err.message, code: err.code, command: err.command, to });
    return { sent: false, reason: err.message };
  }
};

export const generateDefaulterEmail = (studentData, clientUrl) => {
  const { name, subjectsBelowThreshold, neededFor75 } = studentData;
  const lowestPercentage = Math.min(...subjectsBelowThreshold.map((s) => s.percentage));

  return generateDefaulterEmailHtml({
    studentName: name,
    subjects: subjectsBelowThreshold,
    percentage: lowestPercentage,
    neededFor75,
    clientUrl: clientUrl || process.env.CLIENT_URL || 'http://localhost:3000',
  });
};
