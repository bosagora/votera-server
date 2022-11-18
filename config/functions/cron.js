'use strict';

/**
 * Cron config that gives you an opportunity
 * to run scheduled jobs.
 *
 * The cron format consists of:
 * [SECOND (optional)] [MINUTE] [HOUR] [DAY OF MONTH] [MONTH OF YEAR] [DAY OF WEEK]
 *
 * See more details here: https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/configurations.html#cron-tasks
 */

module.exports = {
    '* * * * *': async () => {
        // every minutes
        await strapi.services.cronjob.tryLock('lock:batch:transaction', async () => {
            await strapi.services.transaction.batchJob();
        });
    },
    '*/10 * * * *': async () => {
        // every 10 minutes
        await strapi.services.cronjob.tryLock('lock:batch:proposalCreate', async () => {
            await strapi.services.proposal.batchJobForCreated();
        });
    },
    '0 * * * *': async () => {
        // every hour
        await strapi.services.cronjob.tryLock('lock:batch:proposalAssess', async () => {
            strapi.log.info('batch:proposalAssess locked');
            await strapi.services.proposal.batchJobForAssess();
            strapi.log.info('batch:proposalAssess unlocked');
        });
    },
    '1 * * * *': async () => {
        // every hour at 1 minute (because of openTime in vote)
        await strapi.services.cronjob.tryLock('lock:batch:proposalVote', async () => {
            strapi.log.info('batch:proposalVote locked');
            await strapi.services.proposal.batchJobForVote();
            strapi.log.info('batch:proposalVote unlocked');
        });
    },
    '0 1 * * 1': async () => {
        // every monday am 1:00
        await strapi.services.cronjob.tryLock('lock:batch:weekly', async () => {
            strapi.log.info('batch:weekly locked');
            await strapi.services.feeds.batchJob();
            strapi.log.info('batch.weekly unlocked');
        });
    },
};
