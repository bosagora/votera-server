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
};
