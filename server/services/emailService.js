const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

/**
 * Creates Nodemailer transporter using SMTP credentials or Gmail settings from environment variables.
 */
const createTransporter = () => {
  dotenv.config();
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn('[Email Service Warning] EMAIL_USER / EMAIL_APP_PASSWORD environment variables not configured.');
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
const sendBackupEmail = async (fileBuffer, exportDateISO, counts = {}, fileType = 'xlsx') => {
  try {
    dotenv.config();
    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD;
    const recipient = process.env.ADMIN_NOTIFICATION_EMAIL || user;

    if (!user || !pass || !recipient) {
      console.warn('[Backup Email Warning] Email transport credentials (EMAIL_USER/EMAIL_APP_PASSWORD) or recipient (ADMIN_NOTIFICATION_EMAIL) not set in environment. Backup buffer generated successfully.');
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

    const isExcel = fileType === 'xlsx';
    const filename = isExcel ? `satkar-backup-${dateFileStr}.xlsx` : `satkar-backup-${dateFileStr}.json`;
    const contentType = isExcel
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/json';

    const mailOptions = {
      from: `"Satkar Medical System" <${user}>`,
      to: recipient,
      subject: `Satkar Medical — Quarterly Data Backup (${dateFormatted})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #0B4C52; margin-top: 0;">Satkar Medical Pharmacy System</h2>
          <h3 style="color: #17878E;">Automated Quarterly Data Backup</h3>
          <p>Hello Admin,</p>
          <p>Please find attached the automated database export Excel workbook for Satkar Medical PMS generated on <strong>${dateFormatted}</strong>.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #0B4C52; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #334155;">Excel Workbook Summary (Sheets: Items, Batches, Bills, Returns, Suppliers, Invoices, Settings):</h4>
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
          filename,
          content: fileBuffer,
          contentType,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Backup Email Success] Excel backup email sent to ${recipient} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, recipient };
  } catch (error) {
    console.error('[Backup Email Error] Failed to send email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a daily HTML email digest alerting admin of expiring soon & expired inventory.
 * @param {Object} data - { expiringSoon: Array, expired: Array }
 */
const sendExpiryDigestEmail = async ({ expiringSoon = [], expired = [] }) => {
  try {
    dotenv.config();
    const totalExpiringSoon = expiringSoon.length;
    const totalExpired = expired.length;

    if (totalExpiringSoon === 0 && totalExpired === 0) {
      console.log('[Expiry Email] No items expiring soon or expired today. Skipping email digest.');
      return { success: true, skipped: true, message: 'No expiring or expired items to notify.' };
    }

    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD;
    const recipient = process.env.ADMIN_NOTIFICATION_EMAIL || user;

    if (!user || !pass || !recipient) {
      console.warn('[Expiry Email Warning] Email transport credentials (EMAIL_USER/EMAIL_APP_PASSWORD) or recipient (ADMIN_NOTIFICATION_EMAIL) not set in environment.');
      return {
        success: false,
        skipped: true,
        message: 'Email credentials not configured in environment variables.',
      };
    }

    const transporter = createTransporter();

    // Build subject line with exact counts
    const subjectParts = [];
    if (totalExpiringSoon > 0) subjectParts.push(`${totalExpiringSoon} item${totalExpiringSoon > 1 ? 's' : ''} expiring soon`);
    if (totalExpired > 0) subjectParts.push(`${totalExpired} expired`);
    const subject = `Satkar Medical — ${subjectParts.join(', ')}`;

    const renderTableRows = (items) => {
      return items
        .map((b) => {
          const itemName = b.itemId?.name || 'Unknown Item';
          const storeType = (b.itemId?.storeType || 'medical').toUpperCase();
          const batchNo = b.batchNo || 'N/A';
          const qty = b.qty || 0;
          const expiryDateFormatted = b.expiryDate
            ? new Date(b.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'N/A';

          return `
            <tr style="border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px;">
              <td style="padding: 8px 12px; font-weight: bold; color: #1e293b;">${itemName}</td>
              <td style="padding: 8px 12px; font-family: monospace; color: #475569;">${batchNo}</td>
              <td style="padding: 8px 12px; color: #0f172a;">${expiryDateFormatted}</td>
              <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: #0f172a;">${qty}</td>
              <td style="padding: 8px 12px; text-align: center; font-size: 11px; color: #64748b;">${storeType}</td>
            </tr>
          `;
        })
        .join('');
    };

    const expiringTableHtml =
      totalExpiringSoon > 0
        ? `
          <h3 style="color: #d97706; margin-top: 20px; font-size: 15px;">⚠️ Expiring Within 30 Days (${totalExpiringSoon})</h3>
          <table style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
            <thead>
              <tr style="background: #fef3c7; color: #92400e; text-align: left; font-size: 12px;">
                <th style="padding: 8px 12px;">Item Name</th>
                <th style="padding: 8px 12px;">Batch No</th>
                <th style="padding: 8px 12px;">Expiry Date</th>
                <th style="padding: 8px 12px; text-align: right;">Qty</th>
                <th style="padding: 8px 12px; text-align: center;">Store</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableRows(expiringSoon)}
            </tbody>
          </table>
        `
        : '';

    const expiredTableHtml =
      totalExpired > 0
        ? `
          <h3 style="color: #dc2626; margin-top: 25px; font-size: 15px;">🔴 Already Expired Stock (${totalExpired})</h3>
          <table style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
            <thead>
              <tr style="background: #fee2e2; color: #991b1b; text-align: left; font-size: 12px;">
                <th style="padding: 8px 12px;">Item Name</th>
                <th style="padding: 8px 12px;">Batch No</th>
                <th style="padding: 8px 12px;">Expiry Date</th>
                <th style="padding: 8px 12px; text-align: right;">Qty</th>
                <th style="padding: 8px 12px; text-align: center;">Store</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableRows(expired)}
            </tbody>
          </table>
        `
        : '';

    const dateFormatted = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #0B4C52; margin-top: 0;">Satkar Medical Pharmacy System</h2>
        <p style="color: #475569; font-size: 14px;">Daily Inventory Expiry Alert Digest for <strong>${dateFormatted}</strong></p>
        
        ${expiringTableHtml}
        ${expiredTableHtml}

        <p style="font-size: 12px; color: #64748b; margin-top: 25px; line-height: 1.5;">
          * Action Required: Please review these stock batches. Expired batches should be processed for return to suppliers.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">Satkar Medical Pharmacy Management System • Automated Daily Digest</p>
      </div>
    `;

    const mailOptions = {
      from: `"Satkar Medical Alerts" <${user}>`,
      to: recipient,
      subject,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Expiry Digest Email Success] Alert digest sent to ${recipient} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, recipient, counts: { expiringSoon: totalExpiringSoon, expired: totalExpired } };
  } catch (error) {
    console.error('[Expiry Digest Email Error] Failed to send email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a Security Alert email when a login occurs.
 */
const sendNewLoginSecurityAlert = async ({ userEmail, userName, ipAddress, userAgent }) => {
  try {
    dotenv.config();
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || user;
    const isValidEmail = (emailStr) => emailStr && !emailStr.includes('@satkarmedical.com') && emailStr.includes('@');
    const recipient = isValidEmail(userEmail) ? userEmail : adminEmail;

    if (!user || !pass || !recipient) {
      console.warn('[Security Email Warning] Email transport credentials not configured. Skipping security alert email.');
      return { success: false, skipped: true };
    }

    const transporter = createTransporter();

    const loginTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="background-color: #0B4C52; padding: 16px 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">🛡️ Security Alert: New Account Login</h2>
        </div>
        
        <div style="padding: 20px 0;">
          <p style="color: #334155; font-size: 15px;">Hello <strong>${userName || 'Admin'}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            A new login was detected on your <strong>Satkar Medical Pharmacy Management System</strong> account.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; background-color: #f8fafc; border-radius: 8px;">
            <tr>
              <td style="padding: 10px 14px; color: #64748b; font-weight: bold;">Login Date & Time:</td>
              <td style="padding: 10px 14px; color: #0f172a;">${loginTime} IST</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b; font-weight: bold;">Device / Browser:</td>
              <td style="padding: 10px 14px; color: #0f172a;">${userAgent || 'Web Browser'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: #64748b; font-weight: bold;">IP Address:</td>
              <td style="padding: 10px 14px; color: #0f172a; font-family: monospace;">${ipAddress || 'Client IP'}</td>
            </tr>
          </table>

          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 4px; margin-top: 20px;">
            <p style="color: #991b1b; font-size: 13px; font-weight: bold; margin: 0 0 6px 0;">Was this NOT you?</p>
            <p style="color: #7f1d1d; font-size: 12px; margin: 0; line-height: 1.5;">
              If you did not authorize this login, your account password may be compromised. Please change your Admin password immediately in the <strong>Settings</strong> menu of Satkar Medical System or contact system administrator.
            </p>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">Satkar Medical Pharmacy Management System • Automated Security Notice</p>
      </div>
    `;

    const mailOptions = {
      from: `"Satkar Security Alerts" <${user}>`,
      to: recipient,
      subject: `🚨 Security Alert: New Login to Satkar Medical System (${loginTime})`,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Security Alert Email] Notification sent to ${recipient} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Security Alert Email Error] Failed to send email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendBackupEmail,
  sendExpiryDigestEmail,
  sendNewLoginSecurityAlert,
};
