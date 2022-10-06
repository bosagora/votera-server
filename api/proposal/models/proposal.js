'use strict';

const {
    ENUM_PROPOSAL_STATUS_PENDING_ASSESS,
    ENUM_PROPOSAL_STATUS_PENDING_VOTE,
    ENUM_PROPOSAL_STATUS_ASSESS,
} = require('../../../src/types/proposal');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
    lifecycles: {
        async beforeCreate(data) {
            if (data.memberCount === undefined) {
                data.memberCount = 0;
            }
            if (data.likeCount === undefined) {
                data.likeCount = 0;
            }
        },
        async afterCreate(result, data) {
            try {
                if (
                    result.status === ENUM_PROPOSAL_STATUS_PENDING_ASSESS ||
                    result.status === ENUM_PROPOSAL_STATUS_ASSESS ||
                    result.status === ENUM_PROPOSAL_STATUS_PENDING_VOTE
                ) {
                    const subProposal = {
                        id: result.id,
                        name: result.name,
                        type: result.type,
                        status: result.status,
                        proposalId: result.proposalId,
                        creator: result.creator.id || '',
                    };
                    strapi.services.pubsub.publish('proposalCreated', subProposal).catch((err) => {
                        strapi.log.warn(`publish.proposalCreated failed: proposal.id = ${result.id}`);
                        strapi.log.warn(err);
                    });
                }
            } catch (err) {
                strapi.log.warn(`publish.proposalCreated failed: proposal.id = ${result.id}`);
                strapi.log.warn(err);
            }
        },
        async beforeUpdate(params, data) {
            if (data.status) {
                data.timeAlarm_notified = false;
            }
        },
    },
};
