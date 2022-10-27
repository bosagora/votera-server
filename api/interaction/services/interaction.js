'use strict';

const {
    ENUM_INTERACTION_TYPE_READ_ACTIVITY,
    ENUM_INTERACTION_TYPE_READ_POST,
} = require('../../../src/types/interaction');
const { convertQueryOperationError } = require('../../../src/util/serviceError');
const {
    connectionIsMongoose,
    increaseInteractionReadCountMongoose,
    increaseInteractionReadCountBookshelf,
} = require('../../../src/util/strapi_helper');

let increaseInteractionReadCount;

function chooseModelFunction() {
    if (connectionIsMongoose()) {
        increaseInteractionReadCount = increaseInteractionReadCountMongoose;
    } else {
        increaseInteractionReadCount = increaseInteractionReadCountBookshelf;
    }
}

module.exports = {
    async readInteraction(type, id, actor, user) {
        try {
            if (type !== ENUM_INTERACTION_TYPE_READ_ACTIVITY && type !== ENUM_INTERACTION_TYPE_READ_POST) {
                throw strapi.errors.badRequest('invalid type parameter');
            }
            const isTypeActivity = type === ENUM_INTERACTION_TYPE_READ_ACTIVITY;
            let interactionId;
            const foundInteraction = await strapi.services.interaction.findOne({
                type,
                activity: isTypeActivity ? id : null,
                post: isTypeActivity ? null : id,
                actor,
            });
            if (foundInteraction) {
                if (!increaseInteractionReadCount) {
                    chooseModelFunction();
                }
                await increaseInteractionReadCount(foundInteraction);
                interactionId = foundInteraction.id;
            } else {
                const created = await strapi.services.interaction.create({
                    type,
                    action: [
                        {
                            __component: 'interaction.read',
                            count: 1,
                        },
                    ],
                    activity: isTypeActivity ? id : null,
                    post: isTypeActivity ? null : id,
                    actor,
                    user: user.id,
                });
                interactionId = created.id;
            }
            if (isTypeActivity) {
                return {
                    interaction: await strapi.query('interaction').findOne({ id: interactionId }),
                    activity: await strapi.query('activity').findOne({ id }),
                };
            } else {
                return {
                    interaction: await strapi.query('interaction').findOne({ id: interactionId }),
                    post: await strapi.query('post').findOne({ id }),
                };
            }
        } catch (err) {
            console.log('readInteraction error: ', err);
            throw convertQueryOperationError(err);
        }
    },
};
