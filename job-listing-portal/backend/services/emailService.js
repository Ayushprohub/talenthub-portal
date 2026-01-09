const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

/**
 * Email Service for handling email verification and notifications
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on environment
   */
  initializeTransporter() {
    if (process.env.NODE_ENV === 'production') {
      // Production configuration (use real SMTP service)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Development configuration (use Ethereal for testing)
      this.createTestAccount();
    }
  }

  /**
   * Create test account for development
   */
  async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      console.log('📧 Email service initialized with test account:');
      console.log('   User:', testAccount.user);
      console.log('   Pass:', testAccount.pass);
      console.log('   Preview URLs will be logged for development');
    } catch (error) {
      console.error('Failed to create test email account:', error);
      // Fallback to console logging
      this.transporter = null;
    }
  }

  /**
   * Generate verification token
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Load email template
   */
  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
      return await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      console.error(`Failed to load email template ${templateName}:`, error);
      return null;
    }
  }

  /**
   * Replace placeholders in template
   */
  replacePlaceholders(template, data) {
    let result = template;
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), data[key]);
    });
    return result;
  }

  /**
   * Send verification email to employer
   */
  async sendVerificationEmail(user, verificationToken) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
      
      // Load template or use fallback
      let htmlContent = await this.loadTemplate('emailVerification');
      
      if (!htmlContent) {
        // Fallback HTML template
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Verify Your Email - TalentHub</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #007bff; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to TalentHub!</h1>
              </div>
              <div class="content">
                <h2>Hello {{fullName}},</h2>
                <p>Thank you for registering as an employer on TalentHub. To complete your registration and start posting job listings, please verify your email address.</p>
                <p><strong>Company:</strong> {{companyName}}</p>
                <p>Click the button below to verify your email address:</p>
                <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
                <p>Or copy and paste this link into your browser:</p>
                <p><a href="{{verificationUrl}}">{{verificationUrl}}</a></p>
                <p><strong>Important:</strong> This link will expire in 24 hours for security reasons.</p>
                <p>If you didn't create this account, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>© 2024 TalentHub. All rights reserved.</p>
                <p>This is an automated email. Please do not reply to this message.</p>
              </div>
            </div>
          </body>
          </html>
        `;
      }

      // Replace placeholders
      const emailData = {
        fullName: user.fullName,
        companyName: user.companyName || 'Your Company',
        verificationUrl: verificationUrl
      };

      const finalHtml = this.replacePlaceholders(htmlContent, emailData);

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@talenthub.com',
        to: user.email,
        subject: 'Verify Your Email Address - TalentHub',
        html: finalHtml,
        text: `
Hello ${user.fullName},

Thank you for registering as an employer on TalentHub. 

To complete your registration and start posting job listings, please verify your email address by clicking the following link:

${verificationUrl}

This link will expire in 24 hours for security reasons.

If you didn't create this account, please ignore this email.

Best regards,
TalentHub Team
        `
      };

      if (this.transporter) {
        const info = await this.transporter.sendMail(mailOptions);
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('📧 Verification email sent successfully!');
          console.log('   Message ID:', info.messageId);
          console.log('   Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return {
          success: true,
          messageId: info.messageId,
          previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(info) : null
        };
      } else {
        // Fallback: log to console
        console.log('📧 EMAIL VERIFICATION (Development Mode)');
        console.log('   To:', user.email);
        console.log('   Subject:', mailOptions.subject);
        console.log('   Verification URL:', verificationUrl);
        console.log('   Token:', verificationToken);
        
        return {
          success: true,
          messageId: 'dev-mode',
          previewUrl: null,
          verificationUrl: verificationUrl // Include URL for development
        };
      }

    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(user) {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@talenthub.com',
        to: user.email,
        subject: 'Welcome to TalentHub - Email Verified!',
        html: `
          <h2>Welcome to TalentHub, ${user.fullName}!</h2>
          <p>Your email has been successfully verified. You can now:</p>
          <ul>
            <li>Create and manage job listings</li>
            <li>View applications from job seekers</li>
            <li>Access your employer dashboard</li>
          </ul>
          <p>Get started by logging in to your account and posting your first job!</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">Login to Your Account</a></p>
        `,
        text: `
Welcome to TalentHub, ${user.fullName}!

Your email has been successfully verified. You can now:
- Create and manage job listings
- View applications from job seekers  
- Access your employer dashboard

Get started by logging in to your account and posting your first job!

Login: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login
        `
      };

      if (this.transporter) {
        const info = await this.transporter.sendMail(mailOptions);
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('📧 Welcome email sent!');
          console.log('   Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        return { success: true, messageId: info.messageId };
      } else {
        console.log('📧 WELCOME EMAIL (Development Mode)');
        console.log('   To:', user.email);
        console.log('   Subject:', mailOptions.subject);
        return { success: true, messageId: 'dev-mode' };
      }

    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email failure
      return { success: false, error: error.message };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(user) {
    const newToken = this.generateVerificationToken();
    
    // Update user with new token
    user.verificationToken = newToken;
    await user.save();

    return await this.sendVerificationEmail(user, newToken);
  }
}

module.exports = new EmailService();