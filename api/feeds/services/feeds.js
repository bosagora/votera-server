'use strict';

module.exports = {
    async listFeeds(params, user) {
        const { address } = user.member;
        const notReadCount = await strapi.query('feeds').count({ target: address, isRead: false });
        const count = await strapi.query('feeds').count(params);
        const values = await strapi.query('feeds').find(params);
        return { notReadCount, count, values };
    },
    async batchJob() {
        // remove feed more than 90 days
        try {
            if (strapi.config.server.cron.feedExpireDays > 0) {
                const deleteDate = Date.now() - 86400000 * strapi.config.server.cron.feedExpireDays;
                await strapi.query('feed').delete({ createdAt_lt: deleteDate });
            }
        } catch (err) {
            strapi.log.warn('feed.batchJob failed');
            strapi.log.warn(err);
        }
    },
};
