'use strict';

const {
    ENUM_FOLLOW_TYPE_PROPOSAL_CREATE,
    ENUM_FOLLOW_TYPE_PROPOSAL_JOIN,
    ENUM_FOLLOW_TYPE_POST,
} = require('../../../src/types/follow');

module.exports = {
    async createMyProposal(userFeedId, proposalId) {
        const found = await strapi.query('follow').findOne({
            target: proposalId,
            user_feed: userFeedId,
            type: ENUM_FOLLOW_TYPE_PROPOSAL_CREATE,
        });
        if (found) {
            return found;
        }

        const result = await strapi.query('follow').create({
            target: proposalId,
            isFeedActive: true,
            user_feed: userFeedId,
            type: ENUM_FOLLOW_TYPE_PROPOSAL_CREATE,
        });
        return result;
    },
    async createJoinProposal(userFeedId, proposalId) {
        const found = await strapi.query('follow').findOne({
            target: proposalId,
            user_feed: userFeedId,
            type: ENUM_FOLLOW_TYPE_PROPOSAL_JOIN,
        });
        if (found) {
            return found;
        }

        const result = await strapi.query('follow').create({
            target: proposalId,
            isFeedActive: true,
            user_feed: userFeedId,
            type: ENUM_FOLLOW_TYPE_PROPOSAL_JOIN,
        });
        return result;
    },
    async createMyComment(userFeedId, postId) {
        const found = await strapi.query('follow').findOne({
            target: postId,
            user_feed: userFeedId,
            type: ENUM_FOLLOW_TYPE_POST,
        });
        if (found) {
            return found;
        }

        const result = await strapi.query('follow').create({
            target: postId,
            isFeedActive: true,
            user_feed: userFeedId,
            type: ENUM_FOLLOW_TYPE_POST,
        });
        return result;
    },
};
