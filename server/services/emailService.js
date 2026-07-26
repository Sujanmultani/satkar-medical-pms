const nodemailer = require('nodemailer');

/**
 * Creates Nodemailer transporter using SMTP credentials or Gmail settings from environment variables.
 */
const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn('[Email Service Warning] EMAIL_USER / EMAIL_PASS environment variables not configured.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
};

/**
 * Sends data backup JSON as email attachment to admin.
 * @param {Buffer} jsonBuffer - In-memory JSON buffer
 * @param {string} exportDateISO - Date ISO string
 * @param {Object} counts - Document counts per collection
 */
const sendBackupEmail = async (jsonBuffer, exportDateISO, counts = {}) => {
  try {
    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
    const recipient = process.env.ADMIN_NOTIFICATION_EMAIL || user;

    if (!user || !pass || !recipient) {
      console.warn('[Backup Email Warning] Email transport credentials (EMAIL_USER/EMAIL_PASS) or recipient (ADMIN_NOTIFICATION_EMAIL) not set in environment. Backup JSON buffer generated successfully.');
      return {
        success: false,
        skipped: true,
        message: 'Email credentials not configured in environment variables. Backup generated locally in memory.',
      };
    }

    const transporter = createTransporter();

    const dateFormatted = new Date(exportDateISO).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const dateFileStr = new Date(exportDateISO).toISOString().split('T')[0];

    const mailOptions = {
      from: `"Satkar Medical System" <${user}>`,
      to: recipient,
      subject: `Satkar Medical — Quarterly Data Backup (${dateFormatted})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #0B4C52; margin-top: 0;">Satkar Medical Pharmacy System</h2>
          <h3 style="color: #17878E;">Automated Quarterly Database Backup</h3>
          <p>Hello Admin,</p>
          <p>Please find attached the automated database backup JSON export for Satkar Medical PMS generated on <strong>${dateFormatted}</strong>.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #0B4C52; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #334155;">Collection Export Summary:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #475569; font-family: monospace; line-height: 1.6;">
              <li>Medicines/Items: <strong>${counts.items || 0}</strong></li>
              <li>Stock Batches: <strong>${counts.batches || 0}</strong></li>
              <li>Sales Bills: <strong>${counts.bills || 0}</strong></li>
              <li>Returns: <strong>${counts.returns || 0}</strong></li>
              <li>Suppliers: <strong>${counts.suppliers || 0}</strong></li>
              <li>Invoices: <strong>${counts.invoices || 0}</strong></li>
              <li>Settings: <strong>${counts.settings || 0}</strong></li>
            </ul>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
            * Security & Privacy Note: User credentials and password hashes are strictly excluded from all automated exports. Keep this attachment in a secure location for disaster recovery.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">Satkar Medical Pharmacy Management System • Automated Data Service</p>
        </div>
      `,
      attachments: [
        {
          filename: `satkar-backup-${dateFileStr}.json`,
          content: jsonBuffer,
          contentType: 'application/json',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Backup Email Success] Email sent to ${recipient} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, recipient };
  } catch (error) {
    console.error('[Backup Email Error] Failed to send email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendBackupEmail,
};
