'use strict';
const { sanitizeEntity, parseMultipartData } = require('strapi-utils');
const {
    ENUM_PROPOSAL_TYPE_BUSINESS,
    ENUM_PROPOSAL_TYPE_SYSTEM,
    needCreateNotification,
} = require('../../../src/types/proposal');
const { getValueId } = require('../../../src/util/strapi_helper');

function checkCreateProposalParameter(proposal, ctx) {
    if (!proposal.name || !proposal.type || !proposal.votePeriod || !proposal.proposer_address) {
        return ctx.throw(400, 'missing parameter');
    }
    if (proposal.proposer_address.toLowerCase() !== ctx.state.user.member.address.toLowerCase()) {
        return ctx.throw(400, 'invalid value : proposer_address');
    }
    if (proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS) {
        if (!proposal.fundingAmount) {
            return ctx.throw(400, 'missing parameter');
        }
    } else if (proposal.type !== ENUM_PROPOSAL_TYPE_SYSTEM) {
        return ctx.throw(400, 'unknown proposal type');
    }
}

module.exports = {
    async findById(ctx) {
        const { _proposalId } = ctx.params;
        const proposal = await strapi.services.proposal.findOne({
            proposalId: _proposalId,
        });
        return sanitizeEntity(proposal, { model: strapi.models.proposal });
    },
    async findInfo(ctx) {
        const { _proposalId } = ctx.params;
        if (!_proposalId) return ctx.badRequest('missing parameter');
        const proposalMeta = await strapi.services.proposal.findInfo(_proposalId);
        if (!proposalMeta) return ctx.notFound('not found');
        return proposalMeta;
    },
    async statusById(ctx) {
        const { _proposalId } = ctx.params;
        const proposal = await strapi.services.proposal.findOne({
            proposalId: _proposalId,
        });
        if (!proposal) {
            return null;
        }
        const status = await strapi.services.proposal.proposalStatus(proposal.id, ctx.state.user);
        return status;
    },
    /**
     * Create a record.
     *
     * @return {Object}
     */
    async create(ctx) {
        let proposal;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            const { creator } = data ? data : {};
            await strapi.services.member.authorizeMember(creator, ctx.state.user);
            checkCreateProposalParameter(data, ctx);

            proposal = await strapi.services.proposal.createProposal(data, { files });
        } else {
            const { creator } = ctx.request.body;
            await strapi.services.member.authorizeMember(creator, ctx.state.user);
            checkCreateProposalParameter(ctx.request.body, ctx);

            proposal = await strapi.services.proposal.createProposal(ctx.request.body);
        }

        if (proposal) {
            strapi.services.follow
                .createMyProposal(getValueId(ctx.state.user.user_feed), proposal.id)
                .then(() => {
                    if (needCreateNotification(proposal.status)) {
                        const subProposal = {
                            id: proposal.id,
                            name: proposal.name,
                            type: proposal.type,
                            status: proposal.status,
                            proposalId: proposal.proposalId,
                            creator: getValueId(proposal.creator),
                        };
                        strapi.services.pubsub
                            .publish('proposalCreated', { proposalCreated: subProposal })
                            .catch((err) => {
                                strapi.log.warn(`publish.proposalCreated failed: proposal.id=${proposal.id}\n%j`, err);
                            });
                        strapi.services.notification.onProposalCreated(proposal);
                    }
                })
                .catch((err) => {
                    strapi.log.warn(
                        `follow.createProposal failed: proposal.id=${proposal.id} proposal_id=${proposal.proposalId}\n%j`,
                        err,
                    );
                });
        }

        return sanitizeEntity(proposal, { model: strapi.models.proposal });
    },
    async joinProposal(ctx) {
        const { id, actor } = ctx.request.body;
        if (!id || !actor) return ctx.throw(400, 'missing parameter');
        const checkMember = await strapi.services.member.authorizeMember(actor, ctx.state.user);
        if (!checkMember) {
            return;
        }

        const result = await strapi.services.proposal.joinProposal(id, checkMember.member);
        if (result?.proposal) {
            result.proposal = sanitizeEntity(result.proposal, { model: strapi.models.proposal });

            strapi.services.follow
                .createJoinProposal(getValueId(ctx.state.user.user_feed), result.proposal.id)
                .catch((err) => {
                    strapi.log.warn(
                        `follow.createJoinProposal failed: proposal.id=${result.proposal.id} member.id=${checkMember.member.id}\n%j`,
                        err,
                    );
                });
        }

        return result;
    },
    async listProposal(ctx) {
        const { params } = ctx;
        const response = await strapi.services.proposal.listProposal(params, ctx.state.user);
        return {
            count: response.count,
            values: response.values.map((value) => sanitizeEntity(value, { model: strapi.models.proposal })),
            statuses: response.statuses,
        };
    },
    async proposalFee(ctx) {
        const { _proposalId } = ctx.params;
        if (!_proposalId) return ctx.badRequest('missing parameter');
        const proposal = await strapi.query('proposal').findOne({ proposalId: _proposalId });
        if (!proposal) return ctx.notFound('not found proposal');

        const response = await strapi.services.proposal.proposalFee(proposal);
        return response;
    },
    async checkProposalFee(ctx) {
        const { _proposalId: proposalId, _transactionHash: transactionHash } = ctx.params;
        if (!proposalId || !transactionHash) return ctx.badRequest('missing parameter');
        let proposal = await strapi.query('proposal').findOne({ proposalId });
        if (!proposal) return ctx.notFound('not found proposal');

        const response = await strapi.services.proposal.checkProposalFee(proposal, transactionHash);
        if (response?.proposal) {
            response.proposal = sanitizeEntity(response.proposal, { model: strapi.models.proposal });
        }
        return response;
    },
    async feePolicy(ctx) {
        const response = await strapi.services.proposal.feePolicy();
        return response;
    },
    async submitAssess(ctx) {
        const { proposalId, content, transactionHash } = ctx.request.body;
        if (!proposalId || !content) return ctx.badRequest('missing parameter');
        if (!ctx.state.user) return ctx.unauthorized('unauthorized');
        const user = ctx.state.user;
        if (!user.member) return ctx.unauthorized('unauthorized');

        const post = await strapi.services.proposal.submitAssess(proposalId, content, transactionHash, user.member);
        return sanitizeEntity(post, { model: strapi.models.post });
    },
    async assessResult(ctx) {
        const { _proposalId, _actor } = ctx.params;
        if (!_proposalId) return ctx.badRequest('missing parameter');
        if (_actor) await strapi.services.member.authorizeMember(_actor, ctx.state.user);
        return await strapi.services.proposal.assessResult(_proposalId, _actor);
    },
    async voteStatus(ctx) {
        const { _proposalId, _actor } = ctx.params;
        if (!_proposalId) return ctx.badRequest('missing parameter');
        if (_actor) await strapi.services.member.authorizeMember(_actor, ctx.state.user);
        return await strapi.services.proposal.voteStatus(_proposalId, _actor);
    },
    async voteCount(ctx) {
        const { _proposalId } = ctx.params;
        if (!_proposalId) return ctx.badRequest('missing parameter');
        return await strapi.services.proposal.voteCount(_proposalId);
    },
};
