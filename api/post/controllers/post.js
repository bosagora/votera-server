'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const {
    ENUM_POST_TYPE_SURVEY_RESPONSE,
    ENUM_POST_TYPE_POLL_RESPONSE,
    ENUM_POST_TYPE_BOARD_ARTICLE,
} = require('../../../src/types/post');
const { getValueId } = require('../../../src/util/strapi_helper');

function sanitizePost(entity) {
    return sanitizeEntity(entity, { model: strapi.models.post });
}

module.exports = {
    async find(ctx) {
        let entities;
        if (ctx.query._q) {
            entities = await strapi.services.post.search(ctx.query, []);
        } else {
            entities = await strapi.services.post.find(ctx.query, []);
        }

        return entities.map((entity) => sanitizePost(entity));
    },
    async create(ctx) {
        let post;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            const { activity, type, writer } = data ? data : {};
            if (!activity || !type) return ctx.badRequest('missing parameter');
            await strapi.services.member.authorizeMember(writer, ctx.state.user);
            if (type === ENUM_POST_TYPE_BOARD_ARTICLE) {
                // At present, only administrator has activity role
                await strapi.services['member-role'].checkActivityRole(activity, writer);
            } else {
                await strapi.services['member-role'].checkProposalRoleWithActivity(activity, writer);
            }

            post = await strapi.services.post.create(data, { files });
        } else {
            const { activity, type, writer } = ctx.request.body;
            if (!activity || !type) return ctx.badRequest('missing parameter');
            await strapi.services.member.authorizeMember(writer, ctx.state.user);
            if (type === ENUM_POST_TYPE_BOARD_ARTICLE) {
                // At present, only administrator has activity role
                await strapi.services['member-role'].checkActivityRole(activity, writer);
            } else {
                await strapi.services['member-role'].checkProposalRoleWithActivity(activity, writer);
            }

            post = await strapi.services.post.create(ctx.request.body);
        }
        if (post && post.type !== ENUM_POST_TYPE_SURVEY_RESPONSE && post.type !== ENUM_POST_TYPE_POLL_RESPONSE) {
            strapi.services.follow.createMyComment(getValueId(ctx.state.user.user_feed), post.id).catch((err) => {
                strapi.log.warn(`follow.createMyComment failed: post.id = ${post.id}\n%j`, err);
            });
        }
        return sanitizePost(post);
    },
    async update(ctx) {
        let post;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            const { writer } = data ? data : {};
            await strapi.services.member.authorizeMember(writer, ctx.state.user);

            post = await strapi.services.post.update({ id: ctx.params.id, writer }, data, { files });
        } else {
            const { writer } = ctx.request.body;
            await strapi.services.member.authorizeMember(writer, ctx.state.user);

            post = await strapi.services.post.update({ id: ctx.params.id, writer }, ctx.request.body);
        }
        return sanitizePost(post);
    },
    async delete(ctx) {
        return ctx.forbidden();
    },
    async postStatus(ctx) {
        const { id } = ctx.params;
        if (!id) return ctx.badRequest('missing parameter');
        const response = await strapi.services.post.postStatus(id, ctx.state.user);
        return response;
    },
    async activityPosts(ctx) {
        const { id, _type, _start, _limit, _sort } = ctx.params;
        if (!id || !_type) return ctx.badRequest('missing parameter');

        const response = await strapi.services.post.activityPosts(id, _type, _start, _limit, _sort, ctx.state.user);
        return {
            count: response.count,
            values: response.values.map((value) => sanitizePost(value)),
            statuses: response.statuses,
        };
    },
    async postComments(ctx) {
        const { id, _start, _limit, _sort } = ctx.params;
        if (!id) return ctx.badRequest('missing parameter');

        const response = await strapi.services.post.postComments(id, _start, _limit, _sort, ctx.state.user);
        return {
            count: response.count,
            values: response.values.map((value) => sanitizePost(value)),
            statuses: response.statuses,
        };
    },
    async readArticle(ctx) {
        const { id } = ctx.request.body;
        if (!id) {
            return ctx.badRequest('missing parameter');
        }
        if (!ctx.state.user) {
            return ctx.unauthorized('unauthorized');
        }
        const user = ctx.state.user;
        if (!user.member?.id) {
            return ctx.unauthorized('unauthorized missing member');
        }

        const response = await strapi.services.post.readArticle(id, user.member.id, user);
        return {
            post: sanitizePost(response.post),
            status: response.status,
        };
    },
    async reportPost(ctx) {
        const { postId, activityId, actor } = ctx.request.body;
        if (!postId || !activityId || !actor) return ctx.throw(400, 'missing parameter');
        await strapi.services.member.authorizeMember(actor, ctx.state.user);

        const result = await strapi.services.post.createReportPost(postId, activityId, actor, ctx.state.user);
        return {
            interaction: sanitizeEntity(result.interaction, { model: strapi.models.interaction }),
            post: sanitizePost(result.post),
            status: result.status,
        };
    },
    async restorePost(ctx) {
        const { postId, activityId, actor } = ctx.request.body;
        if (!postId || !activityId || !actor) return ctx.throw(400, 'missing parameter');
        await strapi.services.member.authorizeMember(actor, ctx.state.user);

        const result = await strapi.services.post.deleteReportPost(postId, activityId, actor, ctx.state.user);
        return {
            interaction: sanitizeEntity(result.interaction, { model: strapi.models.interaction }),
            post: sanitizePost(result.post),
            status: result.status,
        };
    },
    async togglePostLike(ctx) {
        const { isLike, postId, memberId } = ctx.request.body;
        if (!postId || !memberId) return ctx.throw(400, 'missing parameter');
        await strapi.services.member.authorizeMember(memberId, ctx.state.user);

        const result = await strapi.services.post.togglePostLike(isLike, postId, memberId, ctx.state.user);
        if (result.post) {
            result.post = sanitizePost(result.post);
        }
        return result;
    },
};
