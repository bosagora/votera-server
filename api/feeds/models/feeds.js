'use strict';

module.exports = {
    lifecycles: {
        async afterCreate(result, data) {
            if (result.isRead) {
                return;
            }
            try {
                const listenFeed = {
                    id: result.id,
                    target: result.target,
                    type: result.type,
                };
                strapi.services.pubsub.publish('listenFeed', { listenFeed }).catch((err) => {
                    strapi.log.warn(`publish.listenFeed failed: feeds.id = ${result.id}`);
                    strapi.log.warn(err);
                });
            } catch (err) {
                strapi.log.warn(`feeds.afterCreate failed: feeds.id = ${result.id}`);
                strapi.log.warn(err);
            }
        },
    },
};
