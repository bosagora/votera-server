'use strict';

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    async updateUserPushToken(ctx) {
        const { id } = ctx.params;
        const { pushId, pushToken, isActive, locale } = ctx.request.body;

        if (!id) {
            return ctx.throw(400, 'missing.id');
        } else if (id.toString() !== ctx.state.user?.id.toString()) {
            return ctx.throw(403, 'unauthorized');
        }
        if (!pushId && !pushToken && !locale) {
            return ctx.throw(400, 'missing.parameter');
        }
        if (pushId && !pushToken && typeof isActive === undefined) {
            return ctx.throw(400, 'missing.parameter');
        }

        const userFeed = await strapi.services['user-feed'].updateUserPushToken(
            ctx.state.user.user_feed.id || ctx.state.user.user_feed,
            pushId,
            pushToken,
            isActive,
            locale,
        );

        return sanitizeEntity(userFeed, { model: strapi.models['user-feed'] });
    },
    async updateUserAlarmStatus(ctx) {
        const { id } = ctx.params;
        const { alarmStatus } = ctx.request.body;

        if (!id) {
            return ctx.throw(400, 'missing.id');
        } else if (id.toString() !== ctx.state.user?.id.toString()) {
            return ctx.throw(403, 'unauthorized');
        }
        if (!alarmStatus) {
            return ctx.throw(400, 'missing.parameter');
        }

        const userFeed = await strapi.services['user-feed'].updateUserAlarmStatus(
            ctx.state.user.user_feed.id || ctx.state.user.user_feed,
            alarmStatus,
        );

        return sanitizeEntity(userFeed, { model: strapi.models['user-feed'] });
    },
};
