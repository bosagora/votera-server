'use strict';

const { convertQueryOperationError } = require('../../../src/util/serviceError');
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

module.exports = {
    async updateUserPushToken(id, pushId, pushToken, isActive, locale) {
        try {
            let userFeed = await strapi.query('user-feed').findOne({ id });
            let updateUserFeed = null;

            const isActiveParams = typeof isActive !== 'undefined';

            if (pushId) {
                const found = userFeed.pushes?.find((p) => p.id === pushId);
                if (!found) {
                    throw strapi.errors.notFound('push.notFound');
                }

                let needPushUpdate = false;
                let updatePush = {};

                if (pushToken && found.token !== pushToken) {
                    needPushUpdate = true;
                    updatePush.token = pushToken;
                    await strapi.query('push').delete({ token: pushToken });
                }
                if (isActiveParams && found.isActive !== !!isActive) {
                    needPushUpdate = true;
                    updatePush.isActive = !!isActive;
                }

                if (needPushUpdate) {
                    await strapi.query('push').update({ id: pushId }, updatePush);
                }
            } else if (pushToken) {
                let push = await strapi.query('push').findOne({ token: pushToken });
                if (push) {
                    if (push.user_feed?.id !== id) {
                        updateUserFeed = {
                            pushes: [...(userFeed.pushes || []), push.id],
                        };
                    }
                    if (isActiveParams && push.isActive !== !!isActive) {
                        push = await strapi.query('push').update({ id: push.id }, { isActive: !!isActive });
                    }
                } else {
                    const newPush = { token: pushToken };
                    if (isActiveParams) {
                        newPush.isActive = !!isActive;
                    }

                    push = await strapi.query('push').create(newPush);
                    updateUserFeed = {
                        pushes: [...(userFeed.pushes || []), push.id],
                    };
                }
                pushId = push.id;
            }

            if (locale) {
                updateUserFeed = { ...(updateUserFeed || {}), locale };
            }

            if (updateUserFeed) {
                userFeed = await this.edit({ id }, updateUserFeed);
            }

            if (userFeed.pushes && pushId) {
                userFeed.pushes = userFeed.pushes.filter((p) => p.id === pushId);
            }
            return userFeed;
        } catch (err) {
            strapi.log.warn(`user-feed.updateUserPushToken failed: user-feed.id=${id}\n%j`, err);
            throw convertQueryOperationError(err);
        }
    },
    async updateUserAlarmStatus(id, alarmStatus) {
        try {
            const userFeed = await strapi.query('user-feed').update({ id }, alarmStatus);
            return userFeed;
        } catch (err) {
            strapi.log.warn(`user-feed.updateUserAlarmStatus failed: user-feed.id=${id}\n%j`, err);
            throw convertQueryOperationError(err);
        }
    },
};
