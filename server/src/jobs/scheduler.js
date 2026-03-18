const cron = require('node-cron');
const { syncManga } = require('./mangaSync');

const startScheduler = () => {
  // Run every day at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[Scheduler] Running daily manga sync...');
    try {
      const result = await syncManga();
      console.log('[Scheduler] Daily sync result:', result);
    } catch (error) {
      console.error('[Scheduler] Daily sync failed:', error.message);
    }
  });

  console.log('[Scheduler] Daily manga sync scheduled for 3:00 AM');
};

module.exports = { startScheduler };
