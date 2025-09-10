const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create reusable transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'test') {
    // Use Ethereal email for testing
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }

  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

const transporter = createTransporter();

// Send email function
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@governance-docs.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text
    };

    if (process.env.NODE_ENV === 'development') {
      logger.info('Email would be sent:', mailOptions);
      return { messageId: 'dev-mode' };
    }

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent:', { messageId: info.messageId, to: options.to });
    return info;
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  approvalRequest: (data) => ({
    subject: `Document Approval Required: ${data.documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Document Approval Request</h1>
            </div>
            <div class="content">
              <p>Hello ${data.approverName},</p>
              <p><strong>${data.authorName}</strong> has submitted a document for your approval:</p>
              <h3>${data.documentTitle}</h3>
              <p>${data.excerpt}</p>
              <p><a href="${process.env.FRONTEND_URL}/documents/${data.documentId}" class="button">Review Document</a></p>
            </div>
            <div class="footer">
              <p>© 2025 Governance Document System</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  approvalNotification: (data) => ({
    subject: `Document ${data.status}: ${data.documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${data.status === 'approved' ? '#27ae60' : '#e74c3c'}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Document ${data.status === 'approved' ? 'Approved' : 'Rejected'}</h1>
            </div>
            <div class="content">
              <p>Hello ${data.authorName},</p>
              <p>Your document "<strong>${data.documentTitle}</strong>" has been ${data.status} by ${data.approverName}.</p>
              ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
              <p><a href="${process.env.FRONTEND_URL}/documents/${data.documentId}">View Document</a></p>
            </div>
            <div class="footer">
              <p>© 2025 Governance Document System</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  passwordReset: (data) => ({
    subject: 'Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3498db; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <p>Hello ${data.firstName},</p>
              <p>You requested a password reset for your account. Click the button below to reset your password:</p>
              <p><a href="${data.resetUrl}" class="button">Reset Password</a></p>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Governance Document System</p>
            </div>
          </div>
        </body>
      </html>
    `
  })
};

module.exports = {
  sendEmail,
  emailTemplates
};