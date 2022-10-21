'use strict';

const { ethers } = require('ethers');

const NONCE_SIZE = 32; // 8

async function findUniqueCommitment(proposalId, address, choice) {
    let nonce, commitment, ballot;
    do {
        do {
            nonce = ethers.BigNumber.from(ethers.utils.randomBytes(NONCE_SIZE));
        } while (nonce.isZero());
        commitment = strapi.services.boaclient.makeCommitment(proposalId, address, choice, nonce);
        ballot = await strapi.query('ballot').findOne({ commitment });
    } while (ballot);

    return { nonce, commitment };
}

module.exports = {
    async submitBallot(proposalId, address, choice) {
        const proposal = await strapi.query('proposal').findOne({ proposalId }, []);
        if (!proposal) throw strapi.errors.notFound('not found proposal');
        const member = await strapi.query('member').findOne({ address }, []);
        if (!member) throw strapi.errors.notFound('not found member');

        const { nonce, commitment } = await findUniqueCommitment(proposalId, address, choice);

        const signature = strapi.services.boaclient.signCommitment(proposalId, address, commitment);

        const voteKey = strapi.services.boaclient.getVoteBoxSealKey(proposalId);
        const cipherText = strapi.services.boaclient.encryptBallot(voteKey.publicKey, choice, nonce);
        if (!cipherText) throw new Error('fail to encrypt');

        const ballot = await strapi.query('ballot').create({
            member: member.id,
            cipherText,
            commitment,
            proposal: proposal.id,
        });

        return { commitment, signature, ballot };
    },
    async recordBallot(proposalId, address, commitment, transactionHash) {
        const proposal = await strapi.query('proposal').findOne({ proposalId }, []);
        if (!proposal) throw strapi.errors.notFound('notFound proposal');
        const member = await strapi.query('member').findOne({ address });
        if (!member) throw strapi.errors.notFound('missing member');

        const ballot = await strapi.query('ballot').findOne({ commitment });
        if (!ballot) throw strapi.errors.notFound('missing ballot');
        if (ballot.proposal.id !== proposal.id || ballot.member.id !== member.id) {
            throw strapi.errors.badRequest('invalid ballot');
        }

        if (transactionHash) {
            await strapi.services.transaction.findOrCreateWithBallot(
                { hash: transactionHash, method: 'submitBallot' },
                ballot,
            );

            strapi.services.transaction.updateReceipt(transactionHash).catch((error) => {
                strapi.log.warn(`submitBallot.updateTransaction failed transactionHash=${transactionHash}`);
                strapi.log.warn(error);
            });
        }

        return ballot;
    },
};
