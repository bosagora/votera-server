'use strict';
const { sanitizeEntity } = require('strapi-utils');
const { ENUM_PROPOSAL_STATUS_CLOSED } = require('../../../src/types/proposal');
const { ENUM_CANDIDATE_MAX } = require('../../../src/types/VoteraVoteType');

module.exports = {
    async submitBallot(ctx) {
        const { proposalId, address, choice } = ctx.request.body;
        if (!proposalId || !address || choice === undefined) return ctx.badRequest('missing parameter');
        if (choice < 0 || choice > ENUM_CANDIDATE_MAX) return ctx.badRequest('invalid choice');
        await strapi.services.member.authorizeMemberAddress(address, ctx.state.user);

        const response = await strapi.services.ballot.submitBallot(proposalId, address, choice);
        if (response?.ballot) {
            response.ballot = sanitizeEntity(response.ballot, { model: strapi.models.ballot });
        }
        return response;
    },
    async recordBallot(ctx) {
        const { proposalId, address, commitment, transactionHash } = ctx.request.body;
        if (!proposalId || !address || !commitment) return ctx.badRequest('missing parameter');
        await strapi.services.member.authorizeMemberAddress(address, ctx.state.user);

        const ballot = await strapi.services.ballot.recordBallot(proposalId, address, commitment, transactionHash);
        return sanitizeEntity(ballot, { model: strapi.models.ballot });
    },
    async listMyBallots(ctx) {
        const { _proposalId, _actor, _start, _limit, _sort } = ctx.params;
        if (!_proposalId || !_actor) return ctx.badRequest('missing parameters');
        await strapi.services.member.authorizeMember(_actor, ctx.state.user);

        const proposal = await strapi.query('proposal').findOne({ proposalId: _proposalId });
        if (!proposal) return ctx.notFound('notFound proposal');
        if (proposal.status !== ENUM_PROPOSAL_STATUS_CLOSED) return ctx.badRequest('NotClosed proposal');

        const response = await strapi.services.ballot.listMyBallots(proposal, _actor, _start, _limit, _sort);
        return response;
    },
};
