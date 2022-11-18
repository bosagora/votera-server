'use strict';

const { sanitizeEntity } = require('strapi-utils/lib');
const { DOMAIN_NAME_SIGNUP, DOMAIN_NAME_SIGNIN } = require('../../../src/types/validator');

module.exports = {
    async isValidator(ctx) {
        const { _address } = ctx.query;
        const response = await strapi.services.validator.isValidator(_address.toLowerCase());
        return response;
    },
    async getSignUpDomain(ctx) {
        const response = await strapi.services.validator.getSignTypeDomain(DOMAIN_NAME_SIGNUP);
        return response;
    },
    async getSignInDomain(ctx) {
        const response = await strapi.services.validator.getSignTypeDomain(DOMAIN_NAME_SIGNIN);
        return response;
    },
    async listAssessValidators(ctx) {
        const { _proposalId, _limit, _start } = ctx.params;
        if (!_proposalId) return ctx.badRequest('missing parameter');
        const entities = await strapi.services.validator.listAssessValidators(_proposalId, _limit ?? 100, _start ?? 0);
        return entities.map((entity) => sanitizeEntity(entity, { model: strapi.models.validator }));
    },
    async listBallotValidators(ctx) {
        const { _proposalId, _limit, _start } = ctx.params;
        if (!_proposalId) return ctx.badRequest('missing parameter');
        const entities = await strapi.services.validator.listBallotValidators(_proposalId, _limit ?? 100, _start ?? 0);
        return entities.map((entity) => sanitizeEntity(entity, { model: strapi.models.validator }));
    },
    async create(ctx) {
        return ctx.forbidden();
    },
    async delete(ctx) {
        return ctx.forbidden();
    },
    async update(ctx) {
        return ctx.forbidden();
    },
    async export(ctx) {
        const { _proposalId } = ctx.params;
        if (!_proposalId) return ctx.badRequest('missing parameter');
        const proposal = await strapi.query('proposal').findOne({ proposalId: _proposalId }, []);
        if (!proposal) return ctx.notFound('not found proposal');

        const csv = await strapi.services.validator.export(proposal);
        ctx.set('Content-disposition', `attachment; filename=${strapi.services.validator.exportName(proposal)}`);
        ctx.set('Content-type', 'text/csv; charset=utf-8');
        return csv;
    },
};
