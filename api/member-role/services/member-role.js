'use strict';

const {
    ENUM_MEMBERROLE_SCOPE_PROPOSAL,
    ENUM_MEMBERROLE_STATUS_NORMAL,
    ENUM_MEMBERROLE_SCOPE_ACTIVITY,
} = require('../../../src/types/member-role');
const { getValueId } = require('../../../src/util/strapi_helper');

module.exports = {
    async checkActivityRole(activityId, memberId) {
        const activity = await strapi.query('activity').findOne({ id: activityId }, []);
        if (!activity) throw strapi.errors.notFound('notFound activity');
        const found = await strapi.query('member-role').findOne(
            {
                scope: ENUM_MEMBERROLE_SCOPE_ACTIVITY,
                status: ENUM_MEMBERROLE_STATUS_NORMAL,
                member: memberId,
                activity: activity.id,
            },
            [],
        );
        if (!found) throw strapi.errors.forbidden('not allowed');
    },
    async checkProposalRoleWithActivity(activityId, memberId) {
        // at present, only check proposal scope
        const activity = await strapi.query('activity').findOne({ id: activityId }, []);
        if (!activity) throw strapi.errors.notFound('notFound activity');
        const proposalId = getValueId(activity.proposal);
        if (!proposalId) throw strapi.errors.badImplementation('missing proposal in activity');
        const found = await strapi.query('member-role').findOne(
            {
                scope: ENUM_MEMBERROLE_SCOPE_PROPOSAL,
                status: ENUM_MEMBERROLE_STATUS_NORMAL,
                member: memberId,
                proposal: proposalId,
            },
            [],
        );
        if (!found) throw strapi.errors.forbidden('not allowed');
    },
    async checkProposalRoleWithPost(postId, memberId) {
        const post = await strapi.query('post').findOne({ id: postId }, ['activity']);
        if (!post) throw strapi.errors.notFound('notFound post');
        if (!post.activity) throw strapi.errors.badImplementation('missing activity in post');
        const proposalId = getValueId(post.activity.proposal);
        if (!proposalId) throw strapi.errors.badImplementation('missing proposal in activity');
        const found = await strapi.query('member-role').findOne(
            {
                scope: ENUM_MEMBERROLE_SCOPE_PROPOSAL,
                status: ENUM_MEMBERROLE_STATUS_NORMAL,
                member: memberId,
                proposal: proposalId,
            },
            [],
        );
        if (!found) throw strapi.errors.forbidden('not allowed');
    },
};
