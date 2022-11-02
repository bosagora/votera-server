'use strict';

async function checkWaitingTransaction(transaction) {
    const receipt = await strapi.services.boaclient.getTransactionReceipt(transaction.transactionHash);
    if (receipt) {
        await strapi.services.transaction.updateWithReceipt(receipt);
    }
}

module.exports = {
    async updateReceipt(hash) {
        let transaction = await strapi.query('transaction').findOne({ transactionHash: hash });
        if (!transaction) {
            throw strapi.errors.notFound('NotFound transaction');
        }
        if (transaction.blockNumber !== 0) {
            return { status: transaction.status };
        }
        try {
            const receipt = await strapi.services.boaclient.waitForTransactionReceipt(hash);
            if (!receipt) {
                throw strapi.errors.badImplementation('transaction error');
            }

            transaction = await strapi.query('transaction').findOne({ transactionHash: hash });
            if (transaction.blockNumber === receipt.blockNumber && transaction.status === receipt.status) {
                return { status: transaction.status };
            }

            await this.updateWithReceipt(receipt);
            return { status: receipt.status };
        } catch (error) {
            if (error.transactionHash === hash) {
                strapi.services.transaction
                    .recordFailedTransaction(error.transactionHash, error.reason)
                    .catch((err) => {
                        strapi.log.warn(
                            `recordFailedTransaction error: hash=${error.transactionHash} reason=${error.reason}`,
                        );
                        strapi.log.warn(err);
                    });
            }
            throw error;
        }
    },
    async updateWithReceipt(receipt) {
        if (!receipt) return null;
        const transaction = await strapi.query('transaction').update(
            { transactionHash: receipt.transactionHash },
            {
                blockNumber: receipt.blockNumber,
                status: receipt.status,
                from: receipt.from,
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: receipt.effectiveGasPrice.toString(),
            },
        );

        if (transaction.method === 'submitAssess') {
            await strapi.services.validator.updateSubmitAssessTransaction(transaction, receipt);
        } else if (transaction.method === 'submitBallot') {
            await strapi.services.validator.updateSubmitBallotTransaction(transaction, receipt);
        }

        return transaction;
    },
    async recordFailedTransaction(hash, reason) {
        if (!hash) {
            return null;
        }
        const transaction = await strapi.query('transaction').update(
            { transactionHash: hash },
            {
                blockNumber: -1,
                status: 0,
                reason,
            },
        );
        return transaction;
    },
    // info : { hash, method }
    async findOrCreateWithProposal(info, proposal) {
        if (!info?.hash) throw strapi.errors.badRequest('missing parameter');
        let created = false;
        let transaction = await strapi.query('transaction').findOne({ transactionHash: info.hash });
        if (!transaction) {
            transaction = await strapi.query('transaction').create({
                transactionHash: info.hash,
                blockNumber: 0,
                proposal: proposal.id,
                method: info.method,
            });
            created = true;
        } else if (transaction.method !== info.method || transaction.proposal.id !== proposal.id) {
            throw strapi.errors.badRequest('inconsistent parameter');
        }
        return { transaction, created };
    },
    async findOrCreateWithPost(info, post) {
        if (!info?.hash) throw strapi.errors.badRequest('missing parameter');
        let transaction = await strapi.query('transaction').findOne({ transactionHash: info.hash });
        if (!transaction) {
            transaction = await strapi.query('transaction').create({
                transactionHash: info.hash,
                blockNumber: 0,
                post: post.id,
                method: info.method,
            });
        } else if (transaction.method !== info.method || transaction.post.id !== post.id) {
            throw strapi.errors.badRequest('inconsistent parameter');
        }
        return transaction;
    },
    async findOrCreateWithBallot(info, ballot) {
        if (!info?.hash) throw strapi.errors.badRequest('missing parameter');
        let transaction = await strapi.query('transaction').findOne({ transactionHash: info.hash });
        if (!transaction) {
            transaction = await strapi.query('transaction').create({
                transactionHash: info.hash,
                blockNumber: 0,
                ballot: ballot.id,
                method: info.method,
            });
        } else if (transaction.method !== info.method || transaction.ballot.id !== ballot.id) {
            throw strapi.errors.badRequest('inconsistent parameter');
        }
        return transaction;
    },
    async batchJob() {
        if (!strapi.services.boaclient.isInitialized()) {
            return;
        }

        const limit = 100;

        for (let offset = 0; ; offset += limit) {
            const transactions = await strapi
                .query('transaction')
                .find({ blockNumber: 0, _start: offset, _limit: limit });
            try {
                await Promise.all(transactions.map((transaction) => checkWaitingTransaction(transaction)));
            } catch (error) {
                strapi.log.warn('transaction.batchJob failed');
                console.warn(error);
            }
            if (transactions.length < limit) {
                break;
            }
        }
    },
};
