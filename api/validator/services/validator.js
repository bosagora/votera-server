'use strict';

const axios = require('axios').default;
const { recoverTypedSignature } = require('../../../src/sign-typed-data');
const { ENUM_PROPOSAL_TYPE_BUSINESS } = require('../../../src/types/proposal');
const { DOMAIN_NAME_SIGNIN, DOMAIN_NAME_SIGNUP } = require('../../../src/types/validator');
const { connectionIsMongoose } = require('../../../src/util/strapi_helper');

const domainType = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
];

const signUpType = [
    { name: 'myWallet', type: 'address' },
    { name: 'userName', type: 'string' },
    { name: 'signTime', type: 'string' },
];

const signInType = [
    { name: 'myWallet', type: 'address' },
    { name: 'signTime', type: 'string' },
];

const VOTERA_SIGNTYPE_VERSION = '1';
const TYPED_SIGNATURE_VERSION = 'V4';

function isValidSignTime(signTime) {
    const signDiff = Math.abs(new Date(signTime).getTime() - Date.now());
    return signDiff < strapi.config.boaclient.signValidTime;
}

function getId(obj) {
    return obj.id !== undefined ? obj.id : obj;
}

async function addBulkValidator(validators, id) {
    if (connectionIsMongoose()) {
        for (let i = 0; i < validators.length; i += 1) {
            const validator = validators[i];
            const address = validator.address.toLowerCase();
            const found = await strapi.query('validator').findOne({ address, proposal: id });
            if (!found) {
                await strapi.query('validator').create({ address, publicKey: validator.pubkey, proposal: id });
            }
        }
    } else {
        const knex = strapi.connections.default;
        await knex('validators').insert(
            validators.map((validator) => ({
                address: validator.address.toLowerCase(),
                publicKey: validator.pubkey,
                proposal: id,
            })),
        );
    }
}

module.exports = {
    async isValidator(address) {
        const url = `${strapi.config.boaclient.query.url}/validator/${address}`;
        const response = await axios.get(url);
        const data = response.data;
        if (!data) return { valid: false };
        if (data.status === 200 && data.data !== undefined) {
            return { valid: true, publicKey: data.data.pubkey };
        } else {
            return { valid: false };
        }
    },
    async getValidatorPublickey(address) {
        const url = `${strapi.config.boaclient.query.url}/validator/${address}`;
        const response = await axios.get(url);
        const data = response.data;
        if (!data) return '';
        if (data.status !== 200 || !data.data) {
            return '';
        }
        return data.data.pubkey;
    },
    async saveValidators(id) {
        // reset validators of proposal
        await strapi.query('validator').delete({ proposal: id });

        for (let page = 1; ; page += 1) {
            const url = `${strapi.config.boaclient.query.url}/validators/?page_index=${page}&page_size=${strapi.config.boaclient.query.pageSize}`;
            const response = await axios.get(url);
            if (response.status !== 200) {
                strapi.log.warn(`validators/?page_index=${page} : status=${response.status} data=${response.data}`);
                throw new Error('fail to query validators list');
            }
            const rawdata = response.data;
            if (rawdata.status !== 200) {
                strapi.log.warn(`validators/?page_index=${page} : status=${response.status} data=${response.data}`);
                throw new Error('fail to query validators list');
            }

            const data = rawdata.data;

            const validators = data.validators;
            if (validators && validators.length > 0) {
                await addBulkValidator(validators, id);
            }

            const header = data.header;
            if (header.page_index >= header.total_page) {
                break;
            }
        }
    },
    async getSignTypeDomain(name) {
        const agora = await strapi.services.agora.find();
        return {
            name,
            version: VOTERA_SIGNTYPE_VERSION,
            chainId: strapi.config.boaclient.chainId,
            verifyingContract: agora.commonsBudgetAddress,
        };
    },
    async isValidSignInSignature(address, signTime, signature) {
        const domain = await this.getSignTypeDomain(DOMAIN_NAME_SIGNIN);
        const recover = recoverTypedSignature({
            data: {
                types: {
                    EIP712Domain: domainType,
                    SignType: signInType,
                },
                primaryType: 'SignType',
                domain,
                message: {
                    myWallet: address,
                    signTime,
                },
            },
            signature,
            version: TYPED_SIGNATURE_VERSION,
        });
        return recover.toLowerCase() === address.toLowerCase() ? isValidSignTime(signTime) : false;
    },
    async isValidSignUpSignature(address, username, signTime, signature) {
        const domain = await this.getSignTypeDomain(DOMAIN_NAME_SIGNUP);
        const recover = recoverTypedSignature({
            data: {
                types: {
                    EIP712Domain: domainType,
                    SignType: signUpType,
                },
                primaryType: 'SignType',
                domain,
                message: {
                    myWallet: address,
                    userName: username,
                    signTime,
                },
            },
            signature,
            version: TYPED_SIGNATURE_VERSION,
        });
        return recover.toLowerCase() === address.toLowerCase() ? isValidSignTime(signTime) : false;
    },
    async listAssessValidators(proposalId, _limit, _start) {
        const proposal = await strapi.query('proposal').findOne({ proposalId });
        if (!proposal) throw strapi.errors.notFound('not found proposal');
        const founds = await strapi
            .query('validator')
            .find({ proposal: proposal.id, _limit, _start, _sort: 'hasAssess:desc,assessUpdate:asc' });
        return founds;
    },
    async updateSubmitAssessTransaction(transaction, receipt) {
        if (!transaction.post || !receipt.status) {
            return;
        }
        const post = await strapi.query('post').findOne({ id: getId(transaction.post) }, ['activity']);
        if (!post?.activity?.proposal) {
            return;
        }

        const assessUpdate = await strapi.services.boaclient.getBlockTimestamp(receipt.blockNumber);
        if (!assessUpdate) {
            return;
        }

        try {
            const address = transaction.from.toLowerCase();
            await strapi.query('validator').update({ address, proposal: post.activity.proposal }, { assessUpdate });
        } catch (err) {
            strapi.log.warn(
                `updateSubmitAssess.Validator error address=${transaction.from} proposal=${post.activity.proposal}\n`,
                err,
            );
        }
    },
    async listBallotValidators(proposalId, _limit, _start) {
        const proposal = await strapi.query('proposal').findOne({ proposalId });
        if (!proposal) throw strapi.errors.notFound('not found proposal');
        const founds = await strapi
            .query('validator')
            .find({ proposal: proposal.id, _limit, _start, _sort: 'hasBallot:desc,ballotUpdate:asc' });
        return founds;
    },
    async updateSubmitBallotTransaction(transaction, receipt) {
        if (!transaction.ballot || !receipt.status) {
            return;
        }
        const ballot = await strapi.query('ballot').findOne({ id: getId(transaction.ballot) }, []);
        if (!ballot?.proposal) {
            return;
        }

        const ballotUpdate = await strapi.services.boaclient.getBlockTimestamp(receipt.blockNumber);
        if (!ballotUpdate) {
            return;
        }

        try {
            const address = transaction.from.toLowerCase();
            await strapi.query('validator').update({ address, proposal: ballot.proposal }, { ballotUpdate });
        } catch (err) {
            strapi.log.warn(
                `updateSubmitBallot.Validator error address=${transaction.from} proposal=${ballot.proposal}\n%j`,
                err,
            );
        }
    },
    async syncAssessValidatorList(proposal) {
        if (proposal.type !== ENUM_PROPOSAL_TYPE_BUSINESS) {
            return;
        }

        const assessCount = await strapi.services.boaclient.getAssessCount(proposal.proposalId);
        const dbCount = await strapi.query('validator').count({ proposal: proposal.id, hasAssess: true });
        if (assessCount === dbCount) {
            return;
        } else if (assessCount < dbCount) {
            // DB에 더 많은 항목이 투표했다고 표시됨
            const extras = [];
            const limit = 100;
            for (let start = 0; ; start += limit) {
                const founds = await strapi
                    .query('validator')
                    .find({ proposal: proposal.id, hasAssess: true, _start: start, _limit: limit });
                for (let i = 0; i < founds.length; i += 1) {
                    const found = founds[i];
                    const contains = await strapi.services.boaclient.isContainAssess(
                        proposal.proposalId,
                        found.address,
                    );
                    if (!contains) {
                        extras.push(found.id);
                    }
                }
                if (founds.length < limit) {
                    break;
                }
            }

            for (let i = 0; i < extras.length; i += 1) {
                await strapi.query('validator').update({ id: extras[i] }, { hasAssess: false, assessUpdate: null });
            }
        } else {
            // Blockchain에 더 많은 항목이 들어가 있음
            const blockHeight = await strapi.services.boaclient.getCurrentBlockHeight();
            const blockTimestamp = await strapi.services.boaclient.getBlockTimestamp(blockHeight);
            for (let i = 0; i < assessCount; i += 1) {
                const address = (await strapi.services.boaclient.getAssessAt(proposal.proposalId, i)).toLowerCase();
                const found = await strapi.query('validator').findOne({ proposal: proposal.id, address });
                if (!found) {
                    // it should not happen
                    const publicKey = await this.getValidatorPublickey(address);
                    await strapi.query('validator').create({
                        address,
                        publicKey,
                        proposal: proposal.id,
                        assessUpdate: blockTimestamp,
                    });
                } else if (!found.hasAssess) {
                    await strapi
                        .query('validator')
                        .update({ id: found.id }, { assessUpdate: blockTimestamp, hasAssess: true });
                }
            }
        }
    },
    async syncBallotValidatorList(proposal) {
        const ballotCount = await strapi.services.boaclient.getBallotCount(proposal.proposalId);
        const dbCount = await strapi.query('validator').count({ proposal: proposal.id, hasBallot: true });
        if (ballotCount === dbCount) {
            return;
        } else if (ballotCount < dbCount) {
            const extras = [];
            const limit = 100;
            for (let start = 0; ; start += limit) {
                const founds = await strapi
                    .query('validator')
                    .find({ proposal: proposal.id, hasBallot: true, _start: start, _limit: limit });
                for (let i = 0; i < founds.length; i += 1) {
                    const found = founds[i];
                    const contains = await strapi.services.boaclient.isContainBallot(
                        proposal.proposalId,
                        found.address,
                    );
                    if (!contains) {
                        extras.push(found.id);
                    }
                }
                if (founds.length < limit) {
                    break;
                }
            }

            for (let i = 0; i < extras.length; i += 1) {
                await strapi.query('validator').update({ id: extras[i] }, { hasBallot: false, ballotUpdate: null });
            }
        } else {
            const blockHeight = await strapi.services.boaclient.getCurrentBlockHeight();
            const blockTimestamp = await strapi.services.boaclient.getBlockTimestamp(blockHeight);
            for (let i = 0; i < ballotCount; i += 1) {
                const address = (
                    await strapi.services.boaclient.getBallotAddressAt(proposal.proposalId, i)
                ).toLowerCase();
                const found = await strapi.query('validator').findOne({ proposal: proposal.id, address });
                if (!found) {
                    // it should not happen
                    const publicKey = await this.getValidatorPublickey(address);
                    await strapi.query('validator').create({
                        address,
                        publicKey,
                        proposal: proposal.id,
                        ballotUpdate: blockTimestamp,
                    });
                } else if (!found.hasBallot) {
                    await strapi
                        .query('validator')
                        .update({ id: found.id }, { ballotUpdate: blockTimestamp, hasBallot: true });
                }
            }
        }
    },
};
