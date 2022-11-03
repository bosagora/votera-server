'use strict';

module.exports = {
    async listFeeds(params, user) {
        const feedsParams = { ...params, target: user.id };
        const notReadCount = await strapi.query('feeds').count({ target: user.id, isRead: false });
        const count = await strapi.query('feeds').count(feedsParams);
        const values = await strapi.query('feeds').find(feedsParams);
        return { notReadCount, count, values };
    },
    async feedsStatus(user) {
        const notReadCount = await strapi.query('feeds').count({ target: user.id, isRead: false  });
        return { notReadCount };
    },
    async batchJob() {
        // remove feed more than 90 days
        try {
            if (strapi.config.server.cron.feedExpireDays > 0) {
                const deleteDate = Date.now() - 86400000 * strapi.config.server.cron.feedExpireDays;
                await strapi.query('feed').delete({ createdAt_lt: deleteDate });
            }
        } catch (err) {
            strapi.log.warn('feed.batchJob failed\n%j', err);
        }
    },
};
