'use strict';

const {
    ENUM_INTERACTION_TYPE_LIKE_PROPOSAL,
    ENUM_INTERACTION_TYPE_LIKE_POST,
    ENUM_INTERACTION_TYPE_READ_ACTIVITY,
    ENUM_INTERACTION_TYPE_READ_POST,
    ENUM_INTERACTION_TYPE_REPORT_POST,
} = require('../../../src/types/interaction');
const {
    connectionIsMongoose,
    increaseActivityReadCountMongoose,
    increaseActivityReadCountBookshelf,
    increaseProposalLikeCountMongoose,
    increaseProposalLikeCountBookshelf,
    increasePostReadCountMongoose,
    increasePostReadCountBookshelf,
    increasePostLikeCountMongoose,
    increasePostLikeCountBookshelf,
    increasePostReportCountMongoose,
    increasePostReportCountBookshelf,
} = require('../../../src/util/strapi_helper');

let increaseProposalLikeCount;
let increasePostLikeCount;
let increaseActivityReadCount;
let increasePostReadCount;
let increasePostReportCount;

function chooseModelFunction() {
    if (connectionIsMongoose()) {
        increaseProposalLikeCount = increaseProposalLikeCountMongoose;
        increasePostLikeCount = increasePostLikeCountMongoose;
        increaseActivityReadCount = increaseActivityReadCountMongoose;
        increasePostReadCount = increasePostReadCountMongoose;
        increasePostReportCount = increasePostReportCountMongoose;
    } else {
        increaseProposalLikeCount = increaseProposalLikeCountBookshelf;
        increasePostLikeCount = increasePostLikeCountBookshelf;
        increaseActivityReadCount = increaseActivityReadCountBookshelf;
        increasePostReadCount = increasePostReadCountBookshelf;
        increasePostReportCount = increasePostReportCountBookshelf;
    }
}

async function interactionDeleted(interaction) {
    switch (interaction.type) {
        case ENUM_INTERACTION_TYPE_LIKE_PROPOSAL:
            await increaseProposalLikeCount(interaction.proposal?.id, -1);
            break;
        case ENUM_INTERACTION_TYPE_LIKE_POST:
            await increasePostLikeCount(interaction.post?.id, -1);
            break;
        case ENUM_INTERACTION_TYPE_READ_ACTIVITY:
            if (interaction.action?.length) {
                const action = interaction.action[0];
                if (action?.__component === 'interaction.read') {
                    await increaseActivityReadCount(interaction.activity?.id, -action.count);
                }
            }
            break;
        case ENUM_INTERACTION_TYPE_READ_POST:
            if (interaction.action?.length) {
                const action = interaction.action[0];
                if (action?.__component === 'interaction.read') {
                    await increasePostReadCount(interaction.post?.id, -action.count);
                }
            }
            break;
        case ENUM_INTERACTION_TYPE_REPORT_POST:
            await increasePostReportCount(interaction.post?.id, -1);
            break;
        default:
            break;
    }
}

module.exports = {
    lifecycles: {
        async afterCreate(result, data) {
            if (!increaseProposalLikeCount) {
                chooseModelFunction();
            }
            try {
                switch (result.type) {
                    case ENUM_INTERACTION_TYPE_LIKE_PROPOSAL:
                        await increaseProposalLikeCount(result.proposal?.id, 1);
                        break;
                    case ENUM_INTERACTION_TYPE_LIKE_POST:
                        await increasePostLikeCount(result.post?.id, 1);
                        break;
                    case ENUM_INTERACTION_TYPE_READ_ACTIVITY:
                        await increaseActivityReadCount(result.activity?.id, 1);
                        break;
                    case ENUM_INTERACTION_TYPE_READ_POST:
                        await increasePostReadCount(result.post?.id, 1);
                        break;
                    case ENUM_INTERACTION_TYPE_REPORT_POST:
                        await increasePostReportCount(result.post?.id, 1);
                        break;
                    default:
                        break;
                }
                if (result.type === ENUM_INTERACTION_TYPE_LIKE_POST) {
                    strapi.services.notification.onInteractionCreated(result).catch((err) => {
                        strapi.log.warn(`notification.interactionCreated failed: interaction.id = ${result.id}`);
                        strapi.log.warn(err);
                    });
                }
            } catch (err) {
                strapi.log.warn(`interaction.afterCreate failed: interaction.id = ${result.id}`);
                strapi.log.warn(err);
            }
        },
        async beforeUpdate(params, data) {
            if (!increaseProposalLikeCount) {
                chooseModelFunction();
            }
            try {
                if (!data.action?.length) {
                    return;
                }
                const action = data.action[0];
                if (action?.__component !== 'interaction.read') {
                    return;
                }

                const founds = await strapi.query('interaction').find(params);
                if (founds?.length) {
                    for (let i = 0; i < founds.length; i += 1) {
                        const interaction = founds[i];
                        if (
                            interaction?.type !== ENUM_INTERACTION_TYPE_READ_ACTIVITY &&
                            interaction?.type !== ENUM_INTERACTION_TYPE_READ_POST
                        ) {
                            continue;
                        }
                        if (!interaction?.action?.length) {
                            if (interaction.type === ENUM_INTERACTION_TYPE_READ_ACTIVITY) {
                                await increaseActivityReadCount(interaction.activity?.id, action.count);
                            } else if (interaction.type === ENUM_INTERACTION_TYPE_READ_POST) {
                                await increasePostReadCount(interaction.post?.id, action.count);
                            }
                        } else {
                            const foundAction = interaction.action[0];
                            if (foundAction?.component !== 'interaction.read') {
                                // This is error case
                                continue;
                            }
                            if (foundAction.count === action.count) {
                                continue;
                            }
                            const diff = action.count - foundAction.count;
                            if (interaction.type === ENUM_INTERACTION_TYPE_READ_ACTIVITY) {
                                await increaseActivityReadCount(interaction.activity?.id, diff);
                            } else if (interaction.type === ENUM_INTERACTION_TYPE_READ_POST) {
                                await increasePostReadCount(interaction.post?.id, diff);
                            }
                        }
                    }
                }
            } catch (err) {
                console.log('interaction.beforeUpdate catch: ', err);
            }
        },
        async afterDelete(result, params) {
            if (!increaseProposalLikeCount) {
                chooseModelFunction();
            }
            try {
                if (Array.isArray(result)) {
                    for (let i = 0; i < result.length; i += 1) {
                        await interactionDeleted(result);
                    }
                } else {
                    await interactionDeleted(result);
                }
            } catch (err) {
                console.log('interaction.afterDelete catch: ', err);
            }
        },
    },
};
