'use strict';

const _ = require('lodash');
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
    async signInMember(ctx) {
        const { address, signTime, signature } = ctx.request.body;
        if (!address || !signTime || !signature) return ctx.throw(400, 'missing parameter');

        const result = await strapi.services.member.signInMember(address.toLowerCase(), signTime, signature);
        if (result) {
            result.user = sanitizeEntity(result.user, { model: strapi.query('user', 'users-permissions').model });
            if (result.push) delete result.push;
        }
        return result;
    },
    async signUpMember(ctx) {
        const { address, username, signTime, signature, pushToken, locale } = ctx.request.body;
        if (!address || !username || !signTime || !signature) return ctx.throw(400, 'missing parameter');

        const result = await strapi.services.member.signUpMember(
            address.toLowerCase(),
            username,
            signTime,
            signature,
            pushToken,
            locale,
        );
        if (result) {
            result.user = sanitizeEntity(result.user, { model: strapi.query('user', 'users-permissions').model });
            result.push = sanitizeEntity(result.push, { model: strapi.models.push });
        }
        return result;
    },
    async checkDupUserName(ctx) {
        const { _username } = ctx.params;
        if (!_username) return ctx.throw(400, 'missing parameter');
        const result = await strapi.services.member.checkDupUserName(_username);
        return result;
    },
    /**
     * Retrieve records.
     *
     * @return {Object|Array}
     */
    async find(ctx) {
        let entities;
        if (_.has(ctx.query, '_q')) {
            entities = await strapi.services.member.search(ctx.query);
        } else {
            entities = await strapi.services.member.find(ctx.query);
        }

        return sanitizeEntity(
            entities.filter((entity) => entity.status !== 'DELETED'),
            { model: strapi.models.member },
        );
    },
    /**
     * Retrieve a record.
     *
     * @return {Object}
     */
    async findOne(ctx) {
        const { query, params } = ctx;
        const entity = await strapi.services.member.findOne({ ...query, id: params.id });
        if (entity.status === 'DELETED') {
            return null;
        }

        return sanitizeEntity(entity, { model: strapi.models.member });
    },
    /**
     * Count records.
     *
     * @return {Number}
     */
    count(ctx) {
        if (_.has(ctx.query, '_q')) {
            return strapi.services.member.countSearch(ctx.query);
        }
        return strapi.services.member.count(ctx.query);
    },
    /**
     * Update a record.
     *
     * @return {Object}
     */
    async update(ctx) {
        const { member, authorized } = await strapi.services.member.checkMemberUser(ctx.params.id, ctx.state.user);
        if (!member) return ctx.throw(404, 'entry.notFound');
        if (!authorized) return ctx.throw(403, 'not authorized');

        let entity;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            await strapi.services.member.checkUpdateMemberParameter(member, data);
            entity = await strapi.services.member.update({ id: ctx.params.id }, data, { files });
        } else {
            const data = ctx.request.body;
            await strapi.services.member.checkUpdateMemberParameter(member, data);
            entity = await strapi.services.member.update({ id: ctx.params.id }, data);
        }

        return sanitizeEntity(entity, { model: strapi.models.member });
    },
    /**
     * Destroy a record.
     *
     * @return {Object}
     */
    async delete(ctx) {
        const { member, authorized } = await strapi.services.member.checkMemberUser(ctx.params.id, ctx.state.user);
        if (!member) return ctx.throw(404, 'entry.notFound');
        if (!authorized) return ctx.throw(403, 'not authorized');

        const entity = await strapi.services.member.update({ id: ctx.params.id }, { status: 'DELETED' });
        return sanitizeEntity(entity, { model: strapi.models.member });
    },
    async myMembers(ctx) {
        const user = ctx.state.user;
        if (!user) return ctx.throw(403, 'not authorized');

        const userData = await strapi.query('user', 'users-permissions').findOne({ id: user.id });
        return [sanitizeEntity(userData.member, { model: strapi.models.member })];
    },
    async isMember(ctx) {
        const { _address } = ctx.query;
        const member = await strapi.services.member.findOne({ address: _address });
        return member ? true : false;
    },
};
