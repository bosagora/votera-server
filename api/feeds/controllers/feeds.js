'use strict';
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    async listFeeds(ctx) {
        const { params } = ctx;
        if (!ctx.state.user) return ctx.unauthorized('unauthorized');
        const response = await strapi.services.feeds.listFeeds(params, ctx.state.user);
        return {
            notReadCount: response.notReadCount,
            count: response.count,
            values: response.values.map((value) => sanitizeEntity(value, { model: strapi.models.feeds })),
        };
    },
};
