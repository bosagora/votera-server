'use strict';

module.exports = {
    async updateReceipt(ctx) {
        const { hash } = ctx.request.body;
        if (!hash) return ctx.badRequest('missing parameter');
        return await strapi.services.transaction.updateReceipt(hash);
    },
};
