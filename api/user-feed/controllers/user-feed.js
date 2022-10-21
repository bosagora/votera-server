'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    async meFeedEx(ctx) {
        if (!ctx.state.user?.user_feed) {
            return null;
        }

        const { user_feed } = ctx.state.user;

        const userFeed = await strapi.query('user-feed').findOne({ id: user_feed.id || user_feed });
        return sanitizeEntity(userFeed, { model: strapi.models['user-feed'] });
    },
};
