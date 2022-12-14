'use strict';

const { ObjectId } = require('mongodb');
const moment = require('moment');
const {
    ENUM_INTERACTION_TYPE_READ_ACTIVITY,
    ENUM_INTERACTION_TYPE_READ_POST,
    ENUM_INTERACTION_ACTION_READ,
} = require('../types/interaction');
const { ENUM_POST_STATUS_OPEN } = require('../types/post');

async function increaseCountMongoose(id, name, inc) {
    if (!id) {
        return;
    }
    await strapi.query(name).model.update({ _id: ObjectId(id) }, { $inc: inc });
}

async function increaseCountBookself(id, table, field, count) {
    if (!id) {
        return;
    }
    const knex = strapi.connections.default;
    await knex(table)
        .where('id', '=', id)
        .increment(field, count ?? 1);
}

async function increaseProposalMemberCountMongoose(id, count) {
    await increaseCountMongoose(id, 'proposal', { memberCount: count ?? 1 });
}

async function increaseProposalMemberCountBookshelf(id, count) {
    await increaseCountBookself(id, 'proposals', 'memberCount', count);
}

async function increaseProposalLikeCountMongoose(id, count) {
    await increaseCountMongoose(id, 'proposal', { likeCount: count ?? 1 });
}

async function increaseProposalLikeCountBookshelf(id, count) {
    await increaseCountBookself(id, 'proposals', 'likeCount', count);
}

async function increaseActivityMemberCountMongoose(activityId, count) {
    await increaseCountMongoose(activityId, 'activity', { memberCount: count ?? 1 });
}

async function increaseActivityMemberCountBookshelf(activityId, count) {
    await increaseCountBookself(activityId, 'activities', 'memberCount', count);
}

async function increaseActivityReadCountMongoose(activityId, count) {
    await increaseCountMongoose(activityId, 'activity', { readCount: count ?? 1 });
}

async function increaseActivityReadCountBookshelf(activityId, count) {
    await increaseCountBookself(activityId, 'activities', 'readCount', count);
}

async function increaseActivityCommentCountMongoose(activityId, count) {
    await increaseCountMongoose(activityId, 'activity', { commentCount: count ?? 1 });
}

async function increaseActivityCommentCountBookshelf(activityId, count) {
    await increaseCountBookself(activityId, 'activities', 'commentCount', count);
}

async function increaseActivityParticipantCountMongoose(activityId, count) {
    await increaseCountMongoose(activityId, 'activity', { participantCount: count ?? 1 });
}

async function increaseActivityParticipantCountBookshelf(activityId, count) {
    await increaseCountBookself(activityId, 'activities', 'participantCount', count);
}

async function increasePostReadCountMongoose(postId, count) {
    await increaseCountMongoose(postId, 'post', { readCount: count ?? 1 });
}

async function increasePostReadCountBookshelf(postId, count) {
    await increaseCountBookself(postId, 'posts', 'readCount', count);
}

async function increasePostLikeCountMongoose(postId, count) {
    await increaseCountMongoose(postId, 'post', { likeCount: count ?? 1 });
}

async function increasePostLikeCountBookshelf(postId, count) {
    await increaseCountBookself(postId, 'posts', 'likeCount', count);
}

async function increasePostCommentCountMongoose(postId, count) {
    await increaseCountMongoose(postId, 'post', { commentCount: count ?? 1 });
}

async function increasePostCommentCountBookshelf(postId, count) {
    await increaseCountBookself(postId, 'posts', 'commentCount', count);
}

async function increasePostReportCountMongoose(postId, count) {
    await increaseCountMongoose(postId, 'post', { reportCount: count ?? 1 });
}

async function increasePostReportCountBookshelf(postId, count) {
    await increaseCountBookself(postId, 'posts', 'reportCount', count);
}

async function increaseInteractionReadCountMongoose(interaction) {
    if (!interaction?.id) {
        return;
    }
    if (interaction.action?.length) {
        const action = interaction.action[0];
        if (action?.__component === ENUM_INTERACTION_ACTION_READ) {
            await strapi.query('interaction.read').model.update({ _id: ObjectId(action.id) }, { $inc: { count: 1 } });

            if (interaction.type === ENUM_INTERACTION_TYPE_READ_ACTIVITY) {
                await increaseActivityReadCountMongoose(interaction.activity?.id, 1);
            } else if (interaction.type === ENUM_INTERACTION_TYPE_READ_POST) {
                await increasePostReadCountMongoose(interaction.post?.id, 1);
            }
        }
    }
}

async function increaseInteractionReadCountBookshelf(interaction) {
    if (!interaction?.id) {
        return;
    }

    if (interaction.action?.length) {
        const action = interaction.action[0];
        if (action?.__component === ENUM_INTERACTION_ACTION_READ) {
            const knex = strapi.connections.default;
            const subquery = knex('interactions_components')
                .where({
                    field: 'action',
                    interaction_id: interaction.id,
                    component_type: 'components_interaction_reads',
                })
                .select('component_id');
            await knex('components_interaction_reads').where('id', '=', subquery).increment('count', 1);

            if (interaction.type === ENUM_INTERACTION_TYPE_READ_ACTIVITY) {
                await increaseActivityReadCountBookshelf(interaction.activity?.id, 1);
            } else if (interaction.type === ENUM_INTERACTION_TYPE_READ_POST) {
                await increasePostReadCountBookshelf(interaction.post?.id, 1);
            }
        }
    }
}

async function increaseSurveyScaleResultMongoose(componentId, count) {
    return increaseCountMongoose(componentId, 'survey.scale-result', 'count', { count: count ?? 1 });
}

async function increaseSurveyScaleResultBookshelf(componentId, count) {
    return increaseCountBookself(componentId, 'components_survey_scale_results', 'count', count);
}

async function foundUnreadLatestMongoose(activityId, memberId) {
    return Promise.resolve(null);
}

async function foundUnreadLatestBookshelf(activityId, memberId) {
    const knex = strapi.connections.default;
    const rows = await knex
        .from('interactions')
        .innerJoin('interactions_components', (t) => {
            t.on('interactions.id', '=', 'interactions_components.interaction_id');
        })
        .innerJoin('components_interaction_reads', (t) => {
            t.on('components_interaction_reads.id', '=', 'interactions_components.component_id');
        })
        .where('interactions.type', ENUM_INTERACTION_TYPE_READ_POST)
        .andWhere('interactions.activity', activityId)
        .andWhere('interactions.actor', memberId)
        .andWhere('interactions_components.component_type', 'components_interaction_reads')
        .andWhere('components_interaction_reads.count', '=', 0)
        .orderBy('interactions.createdAt', 'desc')
        .limit(1)
        .select('interactions.createdAt');
    return rows?.length ? moment(rows[0].createdAt).toISOString() : undefined;
}

async function foundReadLatestMongoose(activityId, memberId) {
    return Promise.resolve(null);
}

async function foundReadLatestBookshelf(activityId, memberId) {
    const knex = strapi.connections.default;
    const rows = await knex
        .from('interactions')
        .innerJoin('interactions_components', (t) => {
            t.on('interactions.id', '=', 'interactions_components.interaction_id');
        })
        .innerJoin('components_interaction_reads', (t) => {
            t.on('components_interaction_reads.id', '=', 'interactions_components.component_id');
        })
        .where('interactions.type', ENUM_INTERACTION_TYPE_READ_POST)
        .andWhere('interactions.activity', activityId)
        .andWhere('interactions.actor', memberId)
        .andWhere('interactions_components.component_type', 'components_interaction_reads')
        .andWhere('components_interaction_reads.count', '>', 0)
        .orderBy('interactions.updatedAt', 'desc')
        .limit(1)
        .select('interactions.updatedAt');
    return rows?.length ? moment(rows[0].updatedAt).toISOString() : undefined;
}

async function insertManyFeedsMongoose(targets) {
    await strapi.query('feeds').model.insertMany(targets, function (error, docs) {
        if (error) {
            strapi.log.warn('saveFeeds exception\n%j', error);
        }
    });
}

async function insertManyFeedsBookshelf(targets) {
    const knex = strapi.connections.default;
    await knex('feeds').insert(targets);
}

function getValueId(value) {
    return value.id || value;
}

async function existOtherParticipatedPost(post) {
    if (!post.id) {
        return false;
    } else if (!post.writer) {
        return false;
    }

    const founds = await strapi.query('post').find({
        id_ne: post.id,
        activity: getValueId(post.activity),
        type: post.type,
        writer: getValueId(post.writer),
        status: ENUM_POST_STATUS_OPEN,
    });
    return founds && founds.length > 0;
}

function connectionIsMongoose() {
    const name = strapi.config.database.defaultConnection || 'default';
    return strapi.config.database.connections[name].connector === 'mongoose';
}

function sanitizeActivityInGroupList(activity) {
    // eslint-disable-next-line no-unused-vars
    const { posts, survey, poll, ...others } = activity;
    return others;
}

module.exports = {
    increaseInteractionReadCountMongoose,
    increaseInteractionReadCountBookshelf,
    increaseProposalMemberCountMongoose,
    increaseProposalMemberCountBookshelf,
    increaseProposalLikeCountMongoose,
    increaseProposalLikeCountBookshelf,
    increaseActivityMemberCountMongoose,
    increaseActivityMemberCountBookshelf,
    increaseActivityReadCountMongoose,
    increaseActivityReadCountBookshelf,
    increaseActivityCommentCountMongoose,
    increaseActivityCommentCountBookshelf,
    increaseActivityParticipantCountMongoose,
    increaseActivityParticipantCountBookshelf,
    increasePostReadCountMongoose,
    increasePostReadCountBookshelf,
    increasePostLikeCountMongoose,
    increasePostLikeCountBookshelf,
    increasePostCommentCountMongoose,
    increasePostCommentCountBookshelf,
    increasePostReportCountMongoose,
    increasePostReportCountBookshelf,
    increaseSurveyScaleResultMongoose,
    increaseSurveyScaleResultBookshelf,
    foundUnreadLatestMongoose,
    foundUnreadLatestBookshelf,
    foundReadLatestMongoose,
    foundReadLatestBookshelf,
    insertManyFeedsMongoose,
    insertManyFeedsBookshelf,
    existOtherParticipatedPost,
    connectionIsMongoose,
    sanitizeActivityInGroupList,
    getValueId,
};
