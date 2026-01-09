const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const SearchService = require('./searchService');

class NotificationService {
  constructor() {
    // Initialize email transporter (configure based on your email service)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Template cache
    this.templateCache = new Map();
  }

  /**
   * Load and cache email template
   */
  async loadTemplate(templateName) {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    try {
      const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
      const template = await fs.readFile(templatePath, 'utf8');
      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      return null;
    }
  }

  /**
   * Replace template variables with actual values
   */
  renderTemplate(template, variables) {
    let rendered = template;
    
    // Replace simple variables {{variable}}
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, variables[key] || '');
    });

    // Handle conditional blocks {{#if condition}}...{{/if}}
    rendered = rendered.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, condition, content) => {
      return variables[condition] ? content : '';
    });

    // Handle unless blocks {{#unless condition}}...{{/unless}}
    rendered = rendered.replace(/{{#unless\s+(\w+)}}(.*?){{\/unless}}/gs, (match, condition, content) => {
      return !variables[condition] ? content : '';
    });

    return rendered;
  }

  /**
   * Process saved search notifications
   */
  async processSavedSearchNotifications() {
    try {
      console.log('Processing saved search notifications...');
      
      const notifications = await SearchService.checkSavedSearchMatches();
      
      for (const notification of notifications) {
        await this.sendJobMatchNotification(notification);
      }

      console.log(`Processed ${notifications.length} saved search notifications`);
      return notifications.length;
    } catch (error) {
      console.error('Error processing saved search notifications:', error);
      throw error;
    }
  }

  /**
   * Send job match notification email
   */
  async sendJobMatchNotification(notification) {
    try {
      const { user, searchName, newJobs, totalMatches } = notification;
      
      if (!user.email) {
        console.warn(`User ${user._id} has no email address for notifications`);
        return;
      }

      const emailContent = this.generateJobMatchEmail(searchName, newJobs, totalMatches);
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@jobportal.com',
        to: user.email,
        subject: `New job matches for "${searchName}"`,
        html: emailContent.html,
        text: emailContent.text
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Job match notification sent to ${user.email} for search "${searchName}"`);
    } catch (error) {
      console.error('Error sending job match notification:', error);
      throw error;
    }
  }

  /**
   * Generate email content for job matches
   */
  generateJobMatchEmail(searchName, newJobs, totalMatches) {
    const jobsHtml = newJobs.map(job => `
      <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0; color: #333;">
          <a href="${process.env.FRONTEND_URL}/jobs/${job._id}" style="text-decoration: none; color: #007bff;">
            ${job.title}
          </a>
        </h3>
        <p style="margin: 5px 0; color: #666;">
          <strong>Company:</strong> ${job.employer?.companyName || job.employer?.name || 'N/A'}
        </p>
        <p style="margin: 5px 0; color: #666;">
          <strong>Location:</strong> ${job.location?.city || 'N/A'}, ${job.location?.state || 'N/A'}
        </p>
        <p style="margin: 5px 0; color: #666;">
          <strong>Job Type:</strong> ${job.jobType}
        </p>
        <p style="margin: 5px 0; color: #666;">
          <strong>Experience Level:</strong> ${job.experienceLevel}
        </p>
        ${job.salaryRange?.showSalary && job.salaryRange?.min && job.salaryRange?.max ? `
          <p style="margin: 5px 0; color: #666;">
            <strong>Salary:</strong> $${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()} ${job.salaryRange.period}
          </p>
        ` : ''}
        <p style="margin: 10px 0 0 0;">
          <a href="${process.env.FRONTEND_URL}/jobs/${job._id}" 
             style="background-color: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Job
          </a>
        </p>
      </div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Job Matches</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #007bff; margin: 0;">New Job Matches Found!</h1>
          <p style="margin: 10px 0 0 0; color: #666;">
            We found ${newJobs.length} new job${newJobs.length === 1 ? '' : 's'} matching your saved search "<strong>${searchName}</strong>".
          </p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            New Job Listings
          </h2>
          ${jobsHtml}
        </div>

        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>Total matches:</strong> ${totalMatches} job${totalMatches === 1 ? '' : 's'} found for this search.
          </p>
          <p style="margin: 10px 0 0 0; font-size: 14px;">
            <a href="${process.env.FRONTEND_URL}/saved-searches" style="color: #007bff; text-decoration: none;">
              Manage your saved searches
            </a> | 
            <a href="${process.env.FRONTEND_URL}/jobs/search" style="color: #007bff; text-decoration: none;">
              Search for more jobs
            </a>
          </p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center;">
          <p>You're receiving this email because you have job alert notifications enabled for your saved search.</p>
          <p>To unsubscribe from these notifications, please visit your saved searches page and update your notification preferences.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
New Job Matches Found!

We found ${newJobs.length} new job${newJobs.length === 1 ? '' : 's'} matching your saved search "${searchName}".

New Job Listings:
${newJobs.map(job => `
- ${job.title}
  Company: ${job.employer?.companyName || job.employer?.name || 'N/A'}
  Location: ${job.location?.city || 'N/A'}, ${job.location?.state || 'N/A'}
  Job Type: ${job.jobType}
  Experience Level: ${job.experienceLevel}
  ${job.salaryRange?.showSalary && job.salaryRange?.min && job.salaryRange?.max ? 
    `Salary: $${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()} ${job.salaryRange.period}` : ''}
  View: ${process.env.FRONTEND_URL}/jobs/${job._id}
`).join('\n')}

Total matches: ${totalMatches} job${totalMatches === 1 ? '' : 's'} found for this search.

Manage your saved searches: ${process.env.FRONTEND_URL}/saved-searches
Search for more jobs: ${process.env.FRONTEND_URL}/jobs/search

You're receiving this email because you have job alert notifications enabled for your saved search.
To unsubscribe from these notifications, please visit your saved searches page and update your notification preferences.
    `;

    return { html, text };
  }

  /**
   * Send job application notification to employer
   */
  async sendJobApplicationNotification(job, applicant, application) {
    try {
      if (!job.employer?.email) {
        console.warn(`Employer for job ${job._id} has no email address`);
        return;
      }

      const emailContent = this.generateApplicationNotificationEmail(job, applicant, application);
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@jobportal.com',
        to: job.employer.email,
        subject: `New application for "${job.title}"`,
        html: emailContent.html,
        text: emailContent.text
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Application notification sent to ${job.employer.email} for job "${job.title}"`);
    } catch (error) {
      console.error('Error sending application notification:', error);
      throw error;
    }
  }

  /**
   * Generate email content for job application notifications
   */
  generateApplicationNotificationEmail(job, applicant, application) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Job Application</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #28a745; margin: 0;">New Job Application Received!</h1>
          <p style="margin: 10px 0 0 0; color: #666;">
            You have received a new application for your job posting.
          </p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
            Job Details
          </h2>
          <p><strong>Position:</strong> ${job.title}</p>
          <p><strong>Job ID:</strong> ${job._id}</p>
          <p><strong>Posted:</strong> ${new Date(job.createdAt).toLocaleDateString()}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
            Applicant Information
          </h2>
          <p><strong>Name:</strong> ${applicant.name || 'N/A'}</p>
          <p><strong>Email:</strong> ${applicant.email}</p>
          <p><strong>Applied:</strong> ${new Date(application.appliedAt).toLocaleDateString()}</p>
          ${application.coverLetter ? `
            <div style="margin-top: 15px;">
              <strong>Cover Letter:</strong>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 5px;">
                ${application.coverLetter.replace(/\n/g, '<br>')}
              </div>
            </div>
          ` : ''}
        </div>

        <div style="margin-bottom: 20px;">
          <a href="${process.env.FRONTEND_URL}/employer/applications/${application._id}" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-right: 10px;">
            View Application
          </a>
          <a href="${process.env.FRONTEND_URL}/employer/jobs/${job._id}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Manage Job
          </a>
        </div>

        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>Total applications:</strong> ${job.applicationsCount} for this position.
          </p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center;">
          <p>You're receiving this email because you posted a job on our platform.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
New Job Application Received!

You have received a new application for your job posting.

Job Details:
- Position: ${job.title}
- Job ID: ${job._id}
- Posted: ${new Date(job.createdAt).toLocaleDateString()}

Applicant Information:
- Name: ${applicant.name || 'N/A'}
- Email: ${applicant.email}
- Applied: ${new Date(application.appliedAt).toLocaleDateString()}

${application.coverLetter ? `Cover Letter:\n${application.coverLetter}\n` : ''}

View Application: ${process.env.FRONTEND_URL}/employer/applications/${application._id}
Manage Job: ${process.env.FRONTEND_URL}/employer/jobs/${job._id}

Total applications: ${job.applicationsCount} for this position.

You're receiving this email because you posted a job on our platform.
    `;

    return { html, text };
  }

  /**
   * Send job expiration warning to employer
   */
  async sendJobExpirationWarning(job, daysUntilExpiration) {
    try {
      if (!job.employer?.email) {
        console.warn(`Employer for job ${job._id} has no email address`);
        return;
      }

      const emailContent = this.generateExpirationWarningEmail(job, daysUntilExpiration);
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@jobportal.com',
        to: job.employer.email,
        subject: `Job posting "${job.title}" expires in ${daysUntilExpiration} days`,
        html: emailContent.html,
        text: emailContent.text
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Expiration warning sent to ${job.employer.email} for job "${job.title}"`);
    } catch (error) {
      console.error('Error sending expiration warning:', error);
      throw error;
    }
  }

  /**
   * Generate email content for job expiration warnings
   */
  generateExpirationWarningEmail(job, daysUntilExpiration) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Job Posting Expiration Warning</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <h1 style="color: #856404; margin: 0;">Job Posting Expiring Soon</h1>
          <p style="margin: 10px 0 0 0; color: #856404;">
            Your job posting will expire in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? '' : 's'}.
          </p>
        </div>

        <div style="margin-bottom: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #ffc107; padding-bottom: 10px;">
            Job Details
          </h2>
          <p><strong>Position:</strong> ${job.title}</p>
          <p><strong>Posted:</strong> ${new Date(job.createdAt).toLocaleDateString()}</p>
          <p><strong>Expires:</strong> ${new Date(job.expiresAt).toLocaleDateString()}</p>
          <p><strong>Applications:</strong> ${job.applicationsCount}</p>
          <p><strong>Views:</strong> ${job.viewsCount}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">What happens when your job expires?</h3>
          <ul style="color: #666;">
            <li>The job will no longer appear in search results</li>
            <li>Candidates won't be able to apply</li>
            <li>You can still access applications and extend the posting</li>
          </ul>
        </div>

        <div style="margin-bottom: 20px;">
          <a href="${process.env.FRONTEND_URL}/employer/jobs/${job._id}/extend" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-right: 10px;">
            Extend Job Posting
          </a>
          <a href="${process.env.FRONTEND_URL}/employer/jobs/${job._id}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Manage Job
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center;">
          <p>You're receiving this email because your job posting is about to expire.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Job Posting Expiring Soon

Your job posting will expire in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? '' : 's'}.

Job Details:
- Position: ${job.title}
- Posted: ${new Date(job.createdAt).toLocaleDateString()}
- Expires: ${new Date(job.expiresAt).toLocaleDateString()}
- Applications: ${job.applicationsCount}
- Views: ${job.viewsCount}

What happens when your job expires?
- The job will no longer appear in search results
- Candidates won't be able to apply
- You can still access applications and extend the posting

Extend Job Posting: ${process.env.FRONTEND_URL}/employer/jobs/${job._id}/extend
Manage Job: ${process.env.FRONTEND_URL}/employer/jobs/${job._id}

You're receiving this email because your job posting is about to expire.
    `;

    return { html, text };
  }

  /**
   * Send application confirmation email to job seeker
   * Requirements: 9.5
   */
  async sendApplicationConfirmation(application, job, applicant) {
    try {
      if (!applicant.email) {
        console.warn(`Applicant ${applicant._id} has no email address`);
        return;
      }

      const template = await this.loadTemplate('applicationConfirmation');
      if (!template) {
        console.error('Application confirmation template not found');
        return;
      }

      const variables = {
        applicantName: applicant.name || applicant.fullName || 'Job Seeker',
        jobTitle: job.title,
        companyName: job.employer?.companyName || job.employer?.name || 'Company',
        jobLocation: `${job.location?.city || 'N/A'}, ${job.location?.state || 'N/A'}`,
        jobType: job.jobType,
        applicationDate: new Date(application.appliedAt).toLocaleDateString(),
        applicationId: application._id,
        dashboardUrl: `${process.env.FRONTEND_URL}/applications`,
        jobUrl: `${process.env.FRONTEND_URL}/jobs/${job._id}`
      };

      const htmlContent = this.renderTemplate(template, variables);

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@jobportal.com',
        to: applicant.email,
        subject: `Application Confirmed: ${job.title}`,
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Application confirmation sent to ${applicant.email} for job "${job.title}"`);
    } catch (error) {
      console.error('Error sending application confirmation:', error);
      throw error;
    }
  }

  /**
   * Send application status update email to job seeker
   * Requirements: 9.5
   */
  async sendApplicationStatusUpdate(application, job, applicant, newStatus, employerMessage = null) {
    try {
      if (!applicant.email) {
        console.warn(`Applicant ${applicant._id} has no email address`);
        return;
      }

      const template = await this.loadTemplate('applicationStatusUpdate');
      if (!template) {
        console.error('Application status update template not found');
        return;
      }

      const statusMessages = {
        reviewed: 'Your application has been reviewed',
        shortlisted: 'Congratulations! You\'ve been shortlisted',
        rejected: 'Application status update',
        hired: 'Congratulations! You\'ve been selected'
      };

      const statusTexts = {
        reviewed: 'Under Review',
        shortlisted: 'Shortlisted',
        rejected: 'Not Selected',
        hired: 'Hired'
      };

      const nextStepsContent = {
        reviewed: '<p>The employer is currently reviewing your application. You should hear back within a few business days.</p>',
        shortlisted: '<p>The employer is interested in your profile! They may contact you soon for the next steps in the hiring process.</p>',
        rejected: '<p>While this opportunity didn\'t work out, don\'t get discouraged. Keep applying to other positions that match your skills.</p>',
        hired: '<p>Congratulations on your new position! The employer will contact you with next steps and onboarding information.</p>'
      };

      const variables = {
        applicantName: applicant.name || applicant.fullName || 'Job Seeker',
        jobTitle: job.title,
        companyName: job.employer?.companyName || job.employer?.name || 'Company',
        applicationId: application._id,
        applicationDate: new Date(application.appliedAt).toLocaleDateString(),
        status: newStatus,
        statusClass: newStatus,
        statusText: statusTexts[newStatus] || newStatus,
        statusMessage: statusMessages[newStatus] || 'Your application status has been updated',
        employerMessage: employerMessage,
        nextSteps: nextStepsContent[newStatus] || '',
        applicationUrl: `${process.env.FRONTEND_URL}/applications/${application._id}`,
        jobSearchUrl: `${process.env.FRONTEND_URL}/jobs/search`,
        showJobSearch: newStatus === 'rejected'
      };

      const htmlContent = this.renderTemplate(template, variables);

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@jobportal.com',
        to: applicant.email,
        subject: `Application Update: ${job.title} - ${statusTexts[newStatus]}`,
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Application status update sent to ${applicant.email} for job "${job.title}" (${newStatus})`);
    } catch (error) {
      console.error('Error sending application status update:', error);
      throw error;
    }
  }

  /**
   * Send enhanced job expiration notification to employer
   * Requirements: 4.6
   */
  async sendEnhancedJobExpirationNotification(job, daysUntilExpiration) {
    try {
      if (!job.employer?.email) {
        console.warn(`Employer for job ${job._id} has no email address`);
        return;
      }

      const template = await this.loadTemplate('jobExpirationNotification');
      if (!template) {
        console.error('Job expiration notification template not found');
        return;
      }

      const variables = {
        employerName: job.employer?.name || job.employer?.fullName || 'Employer',
        jobTitle: job.title,
        jobId: job._id,
        postedDate: new Date(job.createdAt).toLocaleDateString(),
        expirationDate: new Date(job.expiresAt).toLocaleDateString(),
        jobStatus: job.status,
        applicationsCount: job.applicationsCount || 0,
        viewsCount: job.viewsCount || 0,
        daysUntilExpiration: daysUntilExpiration,
        singleDay: daysUntilExpiration === 1,
        hasApplications: (job.applicationsCount || 0) > 0,
        singleApplication: (job.applicationsCount || 0) === 1,
        lowApplications: (job.applicationsCount || 0) < 3,
        extendJobUrl: `${process.env.FRONTEND_URL}/employer/jobs/${job._id}/extend`,
        manageJobUrl: `${process.env.FRONTEND_URL}/employer/jobs/${job._id}`,
        applicationsUrl: `${process.env.FRONTEND_URL}/employer/jobs/${job._id}/applications`
      };

      const htmlContent = this.renderTemplate(template, variables);

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@jobportal.com',
        to: job.employer.email,
        subject: `Job Expiring Soon: "${job.title}" (${daysUntilExpiration} day${daysUntilExpiration === 1 ? '' : 's'} left)`,
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Enhanced expiration notification sent to ${job.employer.email} for job "${job.title}"`);
    } catch (error) {
      console.error('Error sending enhanced expiration notification:', error);
      throw error;
    }
  }

  /**
   * Send job revision notification to applicants
   * Requirements: 3.5
   */
  async sendJobRevisionNotification(job, applicants, changes) {
    try {
      if (!applicants || applicants.length === 0) {
        console.log(`No applicants to notify for job ${job._id} revision`);
        return;
      }

      const changeDescriptions = [];
      if (changes.title) changeDescriptions.push('Job title');
      if (changes.description) changeDescriptions.push('Job description');
      if (changes.location) changeDescriptions.push('Job location');
      if (changes.salaryRange) changeDescriptions.push('Salary information');
      if (changes.applicationDeadline) changeDescriptions.push('Application deadline');
      if (changes.qualifications) changeDescriptions.push('Required qualifications');
      if (changes.responsibilities) changeDescriptions.push('Job responsibilities');

      const changeText = changeDescriptions.length > 0 
        ? changeDescriptions.join(', ')
        : 'Job details';

      for (const applicant of applicants) {
        if (!applicant.email) continue;

        const mailOptions = {
          from: process.env.FROM_EMAIL || 'noreply@jobportal.com',
          to: applicant.email,
          subject: `Job Update: ${job.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
                <h2 style="color: #007bff; margin: 0;">Job Posting Updated</h2>
                <p style="margin: 10px 0 0 0;">The job you applied for has been updated with new information.</p>
              </div>
              
              <div style="margin-bottom: 20px;">
                <h3>${job.title}</h3>
                <p><strong>Company:</strong> ${job.employer?.companyName || job.employer?.name || 'N/A'}</p>
                <p><strong>Updated:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Changes made to:</strong> ${changeText}</p>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>What this means for you:</strong></p>
                <ul>
                  <li>Your application is still active and being considered</li>
                  <li>Review the updated job details to stay informed</li>
                  <li>No action is required on your part</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.FRONTEND_URL}/jobs/${job._id}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  View Updated Job Details
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center;">
                <p>You're receiving this email because you applied for this job and it has been updated.</p>
              </div>
            </div>
          `
        };

        await this.transporter.sendMail(mailOptions);
      }

      console.log(`Job revision notifications sent to ${applicants.length} applicants for job "${job.title}"`);
    } catch (error) {
      console.error('Error sending job revision notifications:', error);
      throw error;
    }
  }

  /**
   * Send real-time notification (for future WebSocket implementation)
   * Requirements: 3.5, 9.5, 9.6
   */
  async sendRealTimeNotification(userId, notification) {
    try {
      // For now, this is a placeholder for real-time notifications
      // In a full implementation, this would use WebSocket or Server-Sent Events
      console.log(`Real-time notification for user ${userId}:`, notification);
      
      // Store notification in database for later retrieval
      // This would be implemented with a Notification model
      
      return true;
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      throw error;
    }
  }

  /**
   * Process all pending notifications (called by cron job)
   */
  async processAllNotifications() {
    try {
      console.log('Processing all pending notifications...');
      
      // Process saved search notifications
      const searchNotifications = await this.processSavedSearchNotifications();
      
      // Process job expiration warnings (7 days, 3 days, 1 day before expiration)
      const expirationNotifications = await this.processJobExpirationWarnings();
      
      console.log(`Processed ${searchNotifications} search notifications and ${expirationNotifications} expiration warnings`);
      
      return {
        searchNotifications,
        expirationNotifications,
        total: searchNotifications + expirationNotifications
      };
    } catch (error) {
      console.error('Error processing notifications:', error);
      throw error;
    }
  }

  /**
   * Process job expiration warnings
   */
  async processJobExpirationWarnings() {
    try {
      const JobListing = require('../models/job');
      
      // Find jobs expiring in 7, 3, or 1 days
      const warningDays = [7, 3, 1];
      let totalNotifications = 0;
      
      for (const days of warningDays) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + days);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        
        const expiringJobs = await JobListing.find({
          status: 'published',
          expiresAt: {
            $gte: startDate,
            $lte: endDate
          }
        }).populate('employerId', 'email name fullName');
        
        for (const job of expiringJobs) {
          await this.sendEnhancedJobExpirationNotification(job, days);
          totalNotifications++;
        }
      }
      
      return totalNotifications;
    } catch (error) {
      console.error('Error processing job expiration warnings:', error);
      throw error;
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    try {
      await this.transporter.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration error:', error);
      return false;
    }
  }
}

module.exports = new NotificationService();