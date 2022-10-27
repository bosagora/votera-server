'use strict';

const { sanitizeEntity } = require('strapi-utils');
const { getValueId } = require('../../../src/util/strapi_helper');

module.exports = {
    async meFeedEx(ctx) {
        if (!ctx.state.user?.user_feed) {
            return null;
        }

        const userFeed = await strapi.query('user-feed').findOne({ id: getValueId(ctx.state.user.user_feed) });
        return sanitizeEntity(userFeed, { model: strapi.models['user-feed'] });
    },
};
