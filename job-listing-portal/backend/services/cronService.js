const cron = require('node-cron');
const JobListing = require('../models/job');
const JobStatusService = require('./jobStatusService');
const NotificationService = require('./notificationService');

class CronService {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Initialize all cron jobs
   */
  init() {
    console.log('Initializing cron jobs...');
    
    // Job expiration check - runs daily at midnight
    this.scheduleJobExpiration();
    
    // Search index maintenance - runs weekly on Sunday at 2 AM
    this.scheduleSearchIndexMaintenance();
    
    // Cleanup old draft jobs - runs weekly on Monday at 1 AM
    this.scheduleOldDraftCleanup();

    // Job reminder notifications - runs daily at 9 AM
    this.scheduleJobReminders();

    // Saved search notifications - runs every 4 hours
    this.scheduleSavedSearchNotifications();

    console.log('Cron jobs initialized successfully');
  }

  /**
   * Schedule job expiration check
   * Runs daily at midnight to check for expired jobs
   */
  scheduleJobExpiration() {
    const task = cron.schedule('0 0 * * *', async () => {
      console.log('Running job expiration check...');
      
      try {
        const result = await JobStatusService.expireJobs();
        console.log(`Expired ${result.expiredCount} job listings`);
        
        // Send notifications about expired jobs
        if (result.expiredJobs.length > 0) {
          for (const job of result.expiredJobs) {
            console.log(`Job "${job.title}" (ID: ${job._id}) has expired`);
            // TODO: Send notification to employer
          }
        }
      } catch (error) {
        console.error('Error in job expiration check:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('jobExpiration', task);
    task.start();
    console.log('Job expiration cron job scheduled');
  }

  /**
   * Schedule search index maintenance
   * Runs weekly to optimize search performance
   */
  scheduleSearchIndexMaintenance() {
    const task = cron.schedule('0 2 * * 0', async () => {
      console.log('Running search index maintenance...');
      
      try {
        // Get statistics about search performance
        const totalJobs = await JobListing.countDocuments({ status: 'published' });
        const expiredJobs = await JobListing.countDocuments({ status: 'expired' });
        const draftJobs = await JobListing.countDocuments({ status: 'draft' });

        console.log(`Search index stats: ${totalJobs} published, ${expiredJobs} expired, ${draftJobs} draft jobs`);

        // TODO: Implement search index optimization
        // This could include:
        // - Rebuilding text indexes
        // - Cleaning up unused index entries
        // - Updating search statistics
        
        console.log('Search index maintenance completed');
      } catch (error) {
        console.error('Error in search index maintenance:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('searchMaintenance', task);
    task.start();
    console.log('Search index maintenance cron job scheduled');
  }

  /**
   * Schedule cleanup of old draft jobs
   * Runs weekly to remove draft jobs older than 30 days
   */
  scheduleOldDraftCleanup() {
    const task = cron.schedule('0 1 * * 1', async () => {
      console.log('Running old draft cleanup...');
      
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await JobListing.deleteMany({
          status: 'draft',
          createdAt: { $lt: thirtyDaysAgo }
        });

        console.log(`Cleaned up ${result.deletedCount} old draft jobs`);
      } catch (error) {
        console.error('Error in old draft cleanup:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('draftCleanup', task);
    task.start();
    console.log('Old draft cleanup cron job scheduled');
  }

  /**
   * Schedule job reminder notifications
   * Runs daily to send reminders about jobs expiring soon
   */
  scheduleJobReminders() {
    const task = cron.schedule('0 9 * * *', async () => {
      console.log('Running job reminder notifications...');
      
      try {
        // Use enhanced notification service to process all notifications
        const result = await NotificationService.processAllNotifications();
        console.log(`Processed ${result.total} notifications: ${result.searchNotifications} search alerts, ${result.expirationNotifications} expiration warnings`);
      } catch (error) {
        console.error('Error in job reminder notifications:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('jobReminders', task);
    task.start();
    console.log('Job reminder notifications cron job scheduled');
  }

  /**
   * Stop a specific cron job
   */
  stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      console.log(`Stopped cron job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Start a specific cron job
   */
  startJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      console.log(`Started cron job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Stop all cron jobs
   */
  stopAll() {
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`Stopped cron job: ${name}`);
    }
  }

  /**
   * Get status of all cron jobs
   */
  getStatus() {
    const status = {};
    for (const [name, job] of this.jobs) {
      status[name] = {
        running: job.running || false,
        scheduled: job.scheduled || false
      };
    }
    return status;
  }

  /**
   * Schedule saved search notifications
   * Runs every 4 hours to check for new job matches
   */
  scheduleSavedSearchNotifications() {
    const task = cron.schedule('0 */4 * * *', async () => {
      console.log('Running saved search notifications...');
      
      try {
        const notificationCount = await NotificationService.processSavedSearchNotifications();
        console.log(`Processed ${notificationCount} saved search notifications`);
      } catch (error) {
        console.error('Error in saved search notifications:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('savedSearchNotifications', task);
    task.start();
    console.log('Saved search notifications cron job scheduled');
  }
  /**
   * Manually trigger job expiration check
   */
  async triggerJobExpiration() {
    console.log('Manually triggering job expiration check...');
    
    try {
      const result = await JobStatusService.expireJobs();
      console.log(`Manually expired ${result.expiredCount} job listings`);
      return result.expiredCount;
    } catch (error) {
      console.error('Error in manual job expiration:', error);
      throw error;
    }
  }

  /**
   * Manually trigger saved search notifications
   */
  async triggerSavedSearchNotifications() {
    console.log('Manually triggering saved search notifications...');
    
    try {
      const notificationCount = await NotificationService.processSavedSearchNotifications();
      console.log(`Manually processed ${notificationCount} saved search notifications`);
      return notificationCount;
    } catch (error) {
      console.error('Error in manual saved search notifications:', error);
      throw error;
    }
  }
}

module.exports = new CronService();