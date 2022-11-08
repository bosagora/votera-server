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
    '*/10 * * * * *': async () => {
        // every 10 minutes
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
            await strapi.services.proposal.batchJobForAssess();
        });
    },
    '1 * * * *': async () => {
        // every hour at 1 minute (because of openTime in vote)
        await strapi.services.cronjob.tryLock('lock:batch:proposalVote', async () => {
            await strapi.services.proposal.batchJobForVote();
        });
    },
};
