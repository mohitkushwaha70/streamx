const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log('[Email] SMTP not configured — OTP will be logged to console');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  console.log('[Email] SMTP configured:', host + ':' + port);
  return transporter;
}

async function sendOTP(email, code, purpose = 'login') {
  const subject = purpose === 'login'
    ? 'streamX — Your Login OTP'
    : 'streamX — Your Verification OTP';

  const html = `
    <div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;background:#1a1a2e;color:#fff;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#6c5ce7,#a29bfe);padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:28px;color:#fff;">stream<span style="color:#ffd700;">X</span></h1>
      </div>
      <div style="padding:32px;text-align:center;">
        <h2 style="color:#a29bfe;margin-top:0;">Your OTP Code</h2>
        <p style="color:#b0b0b0;font-size:15px;">Use this code to ${purpose === 'login' ? 'sign in' : 'verify your account'}:</p>
        <div style="background:#16213e;border-radius:12px;padding:20px;margin:24px 0;">
          <span style="font-size:42px;font-weight:bold;letter-spacing:12px;color:#ffd700;font-family:monospace;">${code}</span>
        </div>
        <p style="color:#ff6b6b;font-size:13px;">This OTP expires in 10 minutes.</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email.</p>
      </div>
    </div>`;

  const transport = getTransporter();
  if (!transport) {
    console.log(`\n========================================`);
    console.log(`  OTP for ${email}: ${code}`);
    console.log(`  Purpose: ${purpose}`);
    console.log(`========================================\n`);
    return true;
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || `"streamX" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html,
    });
    console.log(`[Email] OTP sent to ${email}`);
    return true;
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
    console.log(`\n========================================`);
    console.log(`  OTP for ${email}: ${code}`);
    console.log(`  Purpose: ${purpose}`);
    console.log(`========================================\n`);
    return true;
  }
}

module.exports = { sendOTP };
