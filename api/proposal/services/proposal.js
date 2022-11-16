'use strict';

const crypto = require('crypto');
const moment = require('moment');
const stringify = require('fast-json-stable-stringify');
const { convertQueryOperationError } = require('../../../src/util/serviceError');
const {
    ENUM_VOTE_STATE_INVALID,
    ENUM_VOTE_STATE_ASSESSING,
    ENUM_VOTE_STATE_RUNNING,
    ENUM_VOTE_STATE_FINISHED,
    ENUM_VOTE_STATE_CREATED,
    ENUM_VOTE_STATE_SETTING,
} = require('../../../src/types/VoteraVoteType');
const {
    ENUM_PROPOSAL_TYPE_BUSINESS,
    ENUM_PROPOSAL_TYPE_SYSTEM,
    ENUM_PROPOSALINFO_TYPE_FUND,
    ENUM_PROPOSALINFO_TYPE_SYSTEM,
    ENUM_PROPOSAL_STATUS_CREATED,
    ENUM_PROPOSAL_STATUS_CANCEL,
    ENUM_PROPOSAL_STATUS_PENDING_ASSESS,
    ENUM_PROPOSAL_STATUS_ASSESS,
    ENUM_FEE_STATUS_PAID,
    ENUM_FEE_STATUS_MINING,
    ENUM_FEE_STATUS_INVALID,
    ENUM_FEE_STATUS_EXPIRED,
    ENUM_FEE_STATUS_WAIT,
    ENUM_FEE_STATUS_ERROR,
    ENUM_PROPOSAL_STATUS_PENDING_VOTE,
    ENUM_PROPOSAL_STATUS_VOTE,
    ENUM_PROPOSAL_STATUS_CLOSED,
    ENUM_PROPOSAL_STATUS_REJECT,
    ENUM_ASSESS_PROPOSAL_STATE_INVALID,
    ENUM_ASSESS_PROPOSAL_STATE_CREATED,
    ENUM_ASSESS_PROPOSAL_STATE_REJECTED,
    ENUM_ASSESS_PROPOSAL_STATE_ACCEPTED,
    ENUM_VOTE_PROPOSAL_STATE_APPROVED,
    ENUM_VOTE_PROPOSAL_STATE_REJECTED,
    ENUM_VOTE_PROPOSAL_STATE_INVALID_QUORUM,
    ENUM_VOTE_PROPOSAL_STATE_ASSESSMENT_FAILED,
    ENUM_VOTE_PROPOSAL_STATE_RUNNING,
    ENUM_VOTE_PROPOSAL_STATE_NONE,
    ENUM_VOTE_PROPOSAL_STATE_WITHDRAWN,
    ENUM_VOTE_PROPOSAL_STATE_NOTALLOWED,
    needCreateNotification,
} = require('../../../src/types/proposal');
const {
    ENUM_ACTIVITY_TYPE_BOARD,
    ENUM_ACTIVITY_TYPE_SURVEY,
    ENUM_ACTIVITY_TYPE_POLL,
    ENUM_ACTIVITY_STATUS_OPEN,
} = require('../../../src/types/activity');
const {
    ENUM_MEMBERROLE_TYPE_USER,
    ENUM_MEMBERROLE_SCOPE_PROPOSAL,
    ENUM_MEMBERROLE_STATUS_NORMAL,
    ENUM_MEMBERROLE_TYPE_ADMINISTRATOR,
    ENUM_MEMBERROLE_SCOPE_ACTIVITY,
} = require('../../../src/types/member-role');
const {
    ENUM_BUDGET_STATE_ACCEPTED,
    ENUM_BUDGET_STATE_REJECTED,
    ENUM_BUDGET_STATE_FINISHED,
    ENUM_BUDGET_STATE_CREATED,
    ENUM_BUDGET_TYPE_FUND,
    ENUM_BUDGET_RESULT_NONE,
    ENUM_BUDGET_RESULT_APPROVED,
    ENUM_BUDGET_RESULT_REJECTED,
    ENUM_BUDGET_RESULT_INVALID_QUORUM,
    ENUM_BUDGET_RESULT_ASSESSMENT_FAILED,
} = require('../../../src/types/CommonsBudgetType');
const { ENUM_POST_TYPE_SURVEY_RESPONSE, ENUM_POST_STATUS_OPEN } = require('../../../src/types/post');
const { ENUM_INTERACTION_TYPE_LIKE_PROPOSAL } = require('../../../src/types/interaction');
const {
    getValueId,
    foundUnreadLatestMongoose,
    foundUnreadLatestBookshelf,
    foundReadLatestMongoose,
    foundReadLatestBookshelf,
    connectionIsMongoose,
} = require('../../../src/util/strapi_helper');

const NOTIFY_CHANGED_STATUS = [
    ENUM_PROPOSAL_STATUS_PENDING_VOTE,
    ENUM_PROPOSAL_STATUS_VOTE,
    ENUM_PROPOSAL_STATUS_CLOSED,
];

let foundUnreadLatest;
let foundReadLatest;

function chooseModelFunction() {
    if (connectionIsMongoose()) {
        foundUnreadLatest = foundUnreadLatestMongoose;
        foundReadLatest = foundReadLatestMongoose;
    } else {
        foundUnreadLatest = foundUnreadLatestBookshelf;
        foundReadLatest = foundReadLatestBookshelf;
    }
}

async function isProposalExists(id) {
    try {
        const found = await strapi.query('proposal').findOne({ proposalId: id });
        if (found !== null) {
            return true;
        }
        return await strapi.services.boaclient.isCommonsBudgetProposalExist(id);
    } catch (err) {
        strapi.log.warn(`idExists failed: proposalId=${id}\n%j`, err);
        throw convertQueryOperationError(err);
    }
}

async function isHashExists(hash) {
    try {
        const found = await strapi.query('proposal').findOne({ doc_hash: hash });
        return found !== null;
    } catch (err) {
        strapi.log.warn(`hashExists failed: hash=${hash}\n%j`, err);
        throw convertQueryOperationError(err);
    }
}

/**
 * Korean Timezone (GMT+9) 기준 시간으로 변경
 * @param {*} period
 * @returns
 */
function confirmDateOnly(period) {
    const data = moment(period);
    return new Date(`${data.format('YYYY-MM-DD')} GMT+0900`).getTime();
}

function getAssessBeginOffset() {
    return strapi.config.votera.services.assess_begin_offset * 1000;
}

function getAssessEndOffset() {
    return strapi.config.votera.services.assess_end_offset * 1000;
}

function getVoteBeginOffset() {
    return strapi.config.votera.services.vote_begin_offset * 1000;
}

function getVoteEndOffset() {
    return strapi.config.votera.services.vote_end_offset * 1000;
}

function getVotePeriod(period) {
    const startDate = confirmDateOnly(period.begin) + getVoteBeginOffset();
    const endDate = confirmDateOnly(period.end) + getVoteEndOffset();

    const vote_start = startDate / 1000;
    const vote_end = endDate / 1000;

    return { vote_start, vote_end };
}

function getAssessPeriod(proposal) {
    let assessStart = null;
    let assessEnd = null;
    if (proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS) {
        if (proposal.assessPeriod) {
            assessStart = (confirmDateOnly(proposal.assessPeriod.begin) + getAssessBeginOffset()) / 1000;
            assessEnd = (confirmDateOnly(proposal.assessPeriod.end) + getAssessEndOffset()) / 1000;
        } else {
            const now = moment();
            assessStart = (confirmDateOnly(now.format('YYYY-MM-DD')) + getAssessBeginOffset()) / 1000;
            assessEnd = (confirmDateOnly(now.add(6, 'd').format('YYYY-MM-DD')) + getAssessEndOffset()) / 1000;
        }
    }
    return { assessStart, assessEnd };
}

async function getUploadFileInfo(id) {
    try {
        const file = await strapi.query('file', 'upload').findOne({ id });
        if (!file) {
            return {};
        } else {
            return {
                name: file.name,
                url: file.url,
                size: file.size,
                doc_hash: file.doc_hash,
            };
        }
    } catch (err) {
        strapi.log.warn(`getUploadFileInfo failed: id=${id}\n%j`, err);
        throw convertQueryOperationError(err);
    }
}

async function getUploadFilesInfo(attachments) {
    const ids = attachments.map((attachment) => getValueId(attachment)).sort();
    const infos = await Promise.all(ids.map(async (id) => getUploadFileInfo(id)));
    return infos;
}

async function getProposalInfo(proposal) {
    const proposalInfo = {
        proposalId: proposal.proposalId,
        name: proposal.name,
        description: proposal.description,
        type:
            proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS ? ENUM_PROPOSALINFO_TYPE_FUND : ENUM_PROPOSALINFO_TYPE_SYSTEM,
        fundingAmount: proposal.fundingAmount,
        logo: proposal.logo ? await getUploadFileInfo(getValueId(proposal.logo)) : {},
        attachment: proposal.attachment ? await getUploadFilesInfo(proposal.attachment) : [],
        vote_start: proposal.vote_start,
        vote_end: proposal.vote_end,
    };
    return stringify(proposalInfo);
}

async function getProposalDocHash(proposal) {
    const proposalInfo = await getProposalInfo(proposal);
    return strapi.services.boaclient.getProposalDocHash(proposalInfo);
}

function getProposalInfoUrl(proposal) {
    return `${strapi.config.votera.proposalInfoHost}/proposalInfo/${proposal.doc_hash}`;
}

async function createAdminMemberRole(activity, proposal) {
    if (!activity || !proposal || !proposal.creator) {
        return;
    }

    await strapi.query('member-role').create({
        type: ENUM_MEMBERROLE_TYPE_ADMINISTRATOR,
        scope: ENUM_MEMBERROLE_SCOPE_ACTIVITY,
        activity: activity.id,
        member: proposal.creator,
        status: ENUM_MEMBERROLE_STATUS_NORMAL,
        proposal: proposal.id,
    });
}

async function createDiscussion(proposal) {
    const activity = await strapi.services.activity.createVoteraActivity({
        type: ENUM_ACTIVITY_TYPE_BOARD,
        name: (proposal?.name || '').slice(0, 64) + '_DISCUSSION',
        status: ENUM_ACTIVITY_STATUS_OPEN,
        creator: proposal.creator,
    });
    await createAdminMemberRole(activity, proposal);
    return activity;
}

async function createNotice(proposal) {
    const activity = await strapi.services.activity.createVoteraActivity({
        type: ENUM_ACTIVITY_TYPE_BOARD,
        name: (proposal?.name || '').slice(0, 64) + '_NOTICE',
        status: ENUM_ACTIVITY_STATUS_OPEN,
        creator: proposal.creator,
    });
    await createAdminMemberRole(activity, proposal);
    return activity;
}

async function createAssess(proposal) {
    if (proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS) {
        const activity = await strapi.services.activity.createVoteraActivity({
            type: ENUM_ACTIVITY_TYPE_SURVEY,
            name: proposal?.name,
            status: ENUM_ACTIVITY_STATUS_OPEN,
            creator: proposal.creator,
        });
        await createAdminMemberRole(activity, proposal);
        return activity;
    } else {
        return undefined;
    }
}

async function createVote(proposal) {
    const activity = await strapi.services.activity.createVoteraActivity({
        type: ENUM_ACTIVITY_TYPE_POLL,
        name: proposal?.name,
        status: ENUM_ACTIVITY_STATUS_OPEN,
        creator: proposal.creator,
    });
    await createAdminMemberRole(activity, proposal);
    return activity;
}

async function getFeeAmount(proposal) {
    if (proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS) {
        return await strapi.services.boaclient.getFundFeeAmount(proposal.fundingAmount);
    } else {
        return await strapi.services.boaclient.getSystemProposalFee();
    }
}

function signProposal(proposal) {
    if (proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS) {
        return strapi.services.boaclient.signFundProposal(
            proposal.proposalId,
            proposal.name,
            proposal.vote_start,
            proposal.vote_end,
            proposal.assessStart,
            proposal.assessEnd,
            proposal.doc_hash,
            proposal.fundingAmount,
            proposal.proposer_address,
        );
    } else {
        return strapi.services.boaclient.signSystemProposal(
            proposal.proposalId,
            proposal.name,
            proposal.vote_start,
            proposal.vote_end,
            proposal.doc_hash,
        );
    }
}

function findLastTransaction(proposal, methodName) {
    const founds = proposal.transactions?.filter((tr) => {
        return tr.method === methodName;
    });
    if (!founds) {
        return null;
    }

    let lastBlockNumber = 0;
    let lastFound = null;
    for (let i = founds.length - 1; i >= 0; i -= 1) {
        const found = founds[i];
        if (found.blockNumber === 0) {
            return found;
        }
        if (lastBlockNumber === 0 || found.blockNumber > lastBlockNumber) {
            lastBlockNumber = found.blockNumber;
            lastFound = found;
        }
    }
    return lastFound;
}

function findMiningTransaction(proposal, methodName) {
    return proposal.transactions?.filter((tr) => {
        return tr.method === methodName && tr.blockNumber === 0;
    });
}

async function waitForProposalTransaction(state, proposal, method) {
    const transaction = findLastTransaction(proposal, method);
    if (!transaction || transaction.blockNumber !== 0) {
        return state;
    } else if (strapi.services.boaclient.skipTransaction(transaction)) {
        return null;
    }

    try {
        const receipt = await strapi.services.boaclient.waitForTransactionReceipt(transaction.transactionHash);
        if (receipt) {
            await strapi.services.transaction.updateWithReceipt(receipt);
        } else {
            strapi.services.transaction.recordFailedTransaction(transaction.transactionHash, 'timeout null receipt');
            return null;
        }

        return await strapi.services.boaclient.getVoteraVoteState(proposal.proposalId);
    } catch (error) {
        if (error.transactionHash === transaction.transactionHash) {
            strapi.services.transaction.recordFailedTransaction(error.transactionHash, error.reason);
        } else if (error.code === 'TIMEOUT') {
            strapi.services.transaction.recordFailedTransaction(transaction.transactionHash, error.reason);
            return null;
        }
        throw error;
    }
}

async function waitForTransaction(transactionInfo, proposal) {
    await strapi.services.transaction.findOrCreateWithProposal(transactionInfo, proposal);
    try {
        const receipt = await strapi.services.boaclient.waitForTransactionReceipt(transactionInfo.hash);
        if (!receipt) {
            return null;
        }
        await strapi.services.transaction.updateWithReceipt(receipt);
        return await strapi.services.boaclient.getVoteraVoteState(proposal.proposalId);
    } catch (error) {
        if (error.transactionHash === transactionInfo.hash) {
            strapi.services.transaction.recordFailedTransaction(error.transactionHash, error.reason);
        }
        throw error;
    }
}

async function waitForProposalMiningTransaction(state, proposal, method) {
    const txs = findMiningTransaction(proposal, method);
    if (!txs || txs.length === 0) {
        return state;
    } else if (txs.some((tx) => strapi.services.boaclient.skipTransaction(tx))) {
        return null;
    }

    await Promise.all(
        txs.map((tx) => {
            return strapi.services.boaclient
                .waitForTransactionReceipt(tx.transactionHash)
                .then((receipt) => {
                    if (receipt) {
                        return strapi.services.transaction.updateWithReceipt(receipt);
                    } else {
                        strapi.services.transaction.recordFailedTransaction(tx.transactionHash, 'timeout null receipt');
                        return Promise.resolve(null);
                    }
                })
                .catch((error) => {
                    if (error.transactionHash === tx.transactionHash) {
                        strapi.services.transaction.recordFailedTransaction(error.transactionHash, error.reason);
                    } else if (error.code === 'TIMEOUT') {
                        strapi.services.transaction.recordFailedTransaction(tx.transactionHash, error.reason);
                    }
                    throw error;
                });
        }),
    );
    return await strapi.services.boaclient.getVoteraVoteState(proposal.proposalId);
}

async function changeCreatedProposalToStatus(proposal, status) {
    if (proposal.status !== ENUM_PROPOSAL_STATUS_CREATED) return proposal;

    const result = await strapi.query('proposal').update({ id: proposal.id }, { status });
    if (result && needCreateNotification(result.status)) {
        try {
            const subProposal = {
                id: result.id,
                name: result.name,
                type: result.type,
                status: result.status,
                proposalId: result.proposalId,
                creator: getValueId(result.creator),
            };
            strapi.services.pubsub.publish('proposalChanged', { proposalChanged: subProposal }).catch((err) => {
                strapi.log.warn(`publish.proposalChanged failed: proposal.id = ${result.id}\n%j`, err);
            });
            strapi.services.pubsub.publish('proposalCreated', { proposalCreated: subProposal }).catch((err) => {
                strapi.log.warn(`publish.proposalCreated failed: proposal.id = ${result.id}\n%j`, err);
            });
            strapi.services.notification.onProposalCreated(result);
        } catch (err) {
            strapi.log.warn(`publish.proposalChanged failed: proposal.id=${result.id}\n%j`, err);
        }
    }
    return result;
}

async function changeProposalStatusFromTo(proposal, from, to) {
    if (proposal.status !== from || from === to) return proposal;

    const result = await strapi.query('proposal').update({ id: proposal.id }, { status: to });
    if (result) {
        const subProposal = {
            id: result.id,
            name: result.name,
            type: result.type,
            status: result.status,
            proposalId: result.proposalId,
            creator: result.creator.id,
        };
        strapi.services.pubsub.publish('proposalChanged', { proposalChanged: subProposal }).catch((err) => {
            strapi.log.warn(`publish.proposalChanged failed: proposal.id = ${result.id}\n%j`, err);
        });
        if (NOTIFY_CHANGED_STATUS.includes(to)) {
            strapi.services.notification.onProposalUpdated(result);
        }
    }
    return result;
}

async function checkExistenceAtStatusCreated(proposal) {
    const now = Date.now() / 1000;

    const isExist = await strapi.services.boaclient.isCommonsBudgetProposalExist(proposal.proposalId);
    if (!isExist) {
        const endDate = proposal.type === ENUM_PROPOSAL_TYPE_SYSTEM ? proposal.vote_start : proposal.assessEnd;
        if (now > endDate) {
            return {
                exist: false,
                changed: await changeCreatedProposalToStatus(proposal, ENUM_PROPOSAL_STATUS_CANCEL),
            };
        } else if (now > endDate - 86400) {
            strapi.services.notification.onProposalTimeAlarm(proposal);
        }
        return { exist: false, changed: null };
    }
    return { exist: true, changed: null };
}

async function checkIsReadyAtStatusCreated(voteraState, proposal) {
    const now = Date.now() / 1000;
    if (voteraState === ENUM_VOTE_STATE_INVALID) {
        throw new Error(`Inconsistent proposalId:${proposal.proposalId} - proposal exist but no voteraVote`);
    } else if (voteraState === ENUM_VOTE_STATE_ASSESSING) {
        if (proposal.type !== ENUM_PROPOSAL_TYPE_BUSINESS) {
            await changeCreatedProposalToStatus(proposal, ENUM_PROPOSAL_STATUS_CANCEL);
            throw new Error(`Inconsistent proposalId:${proposal.proposalId} - not business but state assessing`);
        }
        const status = now < proposal.assessStart ? ENUM_PROPOSAL_STATUS_PENDING_ASSESS : ENUM_PROPOSAL_STATUS_ASSESS;
        return await changeCreatedProposalToStatus(proposal, status);
    } else if (voteraState === ENUM_VOTE_STATE_RUNNING) {
        const budgetState = await strapi.services.boaclient.getCommonsBudgetProposalState(proposal.proposalId);
        let status;
        if (budgetState === ENUM_BUDGET_STATE_REJECTED) {
            status = ENUM_PROPOSAL_STATUS_REJECT;
        } else if (budgetState === ENUM_BUDGET_STATE_CREATED || budgetState === ENUM_BUDGET_STATE_ACCEPTED) {
            status = now < proposal.vote_start ? ENUM_PROPOSAL_STATUS_PENDING_VOTE : ENUM_PROPOSAL_STATUS_VOTE;
        } else if (budgetState === ENUM_BUDGET_STATE_FINISHED) {
            status = ENUM_PROPOSAL_STATUS_CLOSED;
        } else {
            status = ENUM_PROPOSAL_STATUS_CANCEL;
        }
        if (status === ENUM_PROPOSAL_STATUS_CANCEL) {
            await changeCreatedProposalToStatus(proposal, status);
            throw new Error(
                `inconsisten proposalId:${proposal.proposalId} - VoteraVote state=RUNNING but unknown CommonsBudget state=${budgetState}`,
            );
        }
        return await changeCreatedProposalToStatus(proposal, status);
    } else if (voteraState === ENUM_VOTE_STATE_FINISHED) {
        return await changeCreatedProposalToStatus(proposal, ENUM_PROPOSAL_STATUS_CLOSED);
    }
    return null;
}

async function getProposalAddValidatorsParams(id) {
    await strapi.services.validator.saveValidators(id);
    const proposal = await strapi.query('proposal').findOne({ id }, ['validators']);
    const pageSize = Math.ceil((proposal.validators?.length || 0) / strapi.config.boaclient.contract.validatorSize);
    const params = [];
    for (let i = 0; i < pageSize; i += 1) {
        const start = i * strapi.config.boaclient.contract.validatorSize;
        const end = start + strapi.config.boaclient.contract.validatorSize;
        params.push({
            proposalId: proposal.proposalId,
            validators: proposal.validators.slice(start, end).map((v) => v.address),
            finalized: i == pageSize - 1,
        });
    }
    return params;
}

async function processProposalStatusCreated(id) {
    let proposal = await strapi.query('proposal').findOne({ id }, ['transactions']);
    if (proposal?.status !== ENUM_PROPOSAL_STATUS_CREATED) {
        return proposal;
    }

    const checkResponse = await checkExistenceAtStatusCreated(proposal);
    if (!checkResponse.exist) {
        return checkResponse.changed;
    }

    if (!proposal.paidComplete) {
        proposal = await strapi.query('proposal').update({ id }, { paidComplete: true });
    }

    strapi.log.info(`processProposalStatusCreated proposal.id=${id}`);

    let voteraState = await strapi.services.boaclient.getVoteraVoteState(proposal.proposalId);

    if (voteraState === ENUM_VOTE_STATE_CREATED) {
        strapi.log.info(`waitForProposalTransaction.setupVoteInfo proposal.id=${id}`);
        voteraState = await waitForProposalTransaction(voteraState, proposal, 'setupVoteInfo');
        if (voteraState === null) {
            strapi.log.info('waitForProposalTransaction.setupVoteInfo skip');
            return null;
        }

        if (voteraState === ENUM_VOTE_STATE_CREATED) {
            const transactionInfo = await strapi.services.boaclient.setupVoteInfo(
                proposal.proposalId,
                proposal.vote_start,
                proposal.vote_end,
                proposal.vote_open,
                getProposalInfoUrl(proposal),
            );
            strapi.log.info(`waitForTransaction.setupVoteInfo proposal.id=${id}`);
            voteraState = await waitForTransaction(transactionInfo, proposal);
            if (voteraState === ENUM_VOTE_STATE_CREATED || voteraState === null) {
                strapi.log.warn(
                    `processProposalStatusCreated proposal.id=${proposal.id} stopAt setupVoteInfo state=${voteraState}`,
                );
                return null;
            }
        }
    }

    if (voteraState === ENUM_VOTE_STATE_SETTING) {
        strapi.log.info(`waitForProposalMiningTransaction.addValidators proposal.id=${id}`);
        voteraState = await waitForProposalMiningTransaction(voteraState, proposal, 'addValidators');
        if (voteraState === null) {
            strapi.log.info('waitForProposalMiningTransaction.addValidators skip');
            return null;
        }

        if (voteraState === ENUM_VOTE_STATE_SETTING) {
            const params = await getProposalAddValidatorsParams(id);
            // it should be called sequentially because of finalized parameter
            if (params.length === 0) {
                strapi.log.warn(`processProposalStatusCreated.Stoped proposa.id=${id} EMPTY_VALIDATOR`);
                return null;
            }
            for (let i = 0; i < params.length - 1; i += 1) {
                const param = params[i];
                const transInfo = await strapi.services.boaclient.addValidators(
                    param.proposalId,
                    param.validators,
                    param.finalized,
                );
                strapi.log.info(`waitForTransaction.addValidators proposal.id=${id}`);
                await waitForTransaction(transInfo, proposal);
            }

            const lastParam = params[params.length - 1];
            const lastTransInfo = await strapi.services.boaclient.addValidators(
                lastParam.proposalId,
                lastParam.validators,
                lastParam.finalized,
            );
            strapi.log.info(`waitForTransaction.addValidators proposal.id=${id}`);
            voteraState = await waitForTransaction(lastTransInfo, proposal);
            if (voteraState === ENUM_VOTE_STATE_SETTING || voteraState === null) {
                strapi.log.warn(
                    `processProposalStatusCreated proposal.id=${proposal.id} stopAt addValidators state=${voteraState}`,
                );
                return null;
            }
        }
    }

    return await checkIsReadyAtStatusCreated(voteraState, proposal);
}

async function processProposalStatusPendingAssess(id) {
    // 현재 PENDING_ASSESS
    const proposal = await strapi.query('proposal').findOne({ id }, []);
    if (proposal?.status !== ENUM_PROPOSAL_STATUS_PENDING_ASSESS) {
        return proposal;
    }
    if (proposal.type !== ENUM_PROPOSAL_TYPE_BUSINESS) {
        // Business 제안이 아닌데 사전평가 설정 오류
        await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_PENDING_ASSESS, ENUM_PROPOSAL_STATUS_CANCEL);
        throw new Error(`inconsisten proposalId:${proposal.proposalId} - status=PENDING_ASSESS but not Business Type`);
    }

    const now = Date.now() / 1000;
    if (now < proposal.assessStart) {
        return null;
    }

    const voteraState = await strapi.services.boaclient.getVoteraVoteState(proposal.proposalId);
    if (voteraState === ENUM_VOTE_STATE_RUNNING) {
        // 어떤 연유인지 vote가 시작되었음
        const budgetState = await strapi.services.boaclient.getCommonsBudgetProposalState(proposal.proposalId);
        let status;
        if (budgetState === ENUM_BUDGET_STATE_REJECTED) {
            status = ENUM_PROPOSAL_STATUS_REJECT;
        } else if (budgetState === ENUM_BUDGET_STATE_ACCEPTED || budgetState === ENUM_BUDGET_STATE_CREATED) {
            status = now < proposal.vote_start ? ENUM_PROPOSAL_STATUS_PENDING_VOTE : ENUM_PROPOSAL_STATUS_VOTE;
        } else if (budgetState === ENUM_BUDGET_STATE_FINISHED) {
            status = ENUM_PROPOSAL_STATUS_CLOSED;
        } else {
            status = ENUM_PROPOSAL_STATUS_CANCEL;
        }
        if (status === ENUM_PROPOSAL_STATUS_CANCEL) {
            await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_PENDING_ASSESS, status);
            throw new Error(
                `inconsistent proposalId:${proposal.proposalId} - VoteraVote state=RUNNING but unknown CommonsBudget state=${budgetState}`,
            );
        }
        return await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_PENDING_ASSESS, status);
    } else if (voteraState === ENUM_VOTE_STATE_FINISHED) {
        return await changeProposalStatusFromTo(
            proposal,
            ENUM_PROPOSAL_STATUS_PENDING_ASSESS,
            ENUM_PROPOSAL_STATUS_CLOSED,
        );
    } else if (voteraState !== ENUM_VOTE_STATE_ASSESSING) {
        await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_PENDING_ASSESS, ENUM_PROPOSAL_STATUS_CANCEL);
        throw new Error(
            `inconsisten proposalId:${proposal.proposalId} - expecting VoteraVote state=ASSESSING but unknown state=${voteraState}`,
        );
    }

    return await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_PENDING_ASSESS, ENUM_PROPOSAL_STATUS_ASSESS);
}

async function checkCompleteAtStatusAssess(voteraState, proposal) {
    const now = Date.now() / 1000;

    if (voteraState === ENUM_VOTE_STATE_RUNNING) {
        // commons budget에서 proposal의 상태를 확인
        const budgetState = await strapi.services.boaclient.getCommonsBudgetProposalState(proposal.proposalId);
        let status;
        if (budgetState === ENUM_BUDGET_STATE_ACCEPTED) {
            status = now < proposal.vote_start ? ENUM_PROPOSAL_STATUS_PENDING_VOTE : ENUM_PROPOSAL_STATUS_VOTE;
        } else if (budgetState === ENUM_BUDGET_STATE_REJECTED) {
            status = ENUM_PROPOSAL_STATUS_REJECT;
        } else if (budgetState === ENUM_BUDGET_STATE_FINISHED) {
            status = ENUM_PROPOSAL_STATUS_CLOSED;
        } else {
            status = ENUM_PROPOSAL_STATUS_CANCEL;
        }
        if (status === ENUM_PROPOSAL_STATUS_CANCEL) {
            await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_ASSESS, status);
            throw new Error(
                `inconsistent proposalId:${proposal.proposalId} - VoteraVote state=RUNNING but unknown CommonsBudget state=${budgetState}`,
            );
        }
        return await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_ASSESS, status);
    } else if (voteraState === ENUM_VOTE_STATE_FINISHED) {
        return await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_ASSESS, ENUM_PROPOSAL_STATUS_CLOSED);
    } else if (voteraState !== ENUM_VOTE_STATE_ASSESSING) {
        await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_ASSESS, ENUM_PROPOSAL_STATUS_CANCEL);
        throw new Error(
            `inconsistent proposalId:${proposal.proposalId} - expecting VoteraVote state=ASSESSING but unknown state=${voteraState}`,
        );
    }

    return null;
}

async function processProposalStatusAssess(id) {
    // 현재 ASSESS 확인
    const proposal = await strapi.query('proposal').findOne({ id }, ['transactions']);
    if (proposal?.status !== ENUM_PROPOSAL_STATUS_ASSESS) {
        return proposal;
    }
    if (proposal.type !== ENUM_PROPOSAL_TYPE_BUSINESS) {
        // Business 제안이 아닌데 사전평가 설정 오류
        await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_ASSESS, ENUM_PROPOSAL_STATUS_CANCEL);
        throw new Error(`inconsisten proposalId:${proposal.proposalId} - status=ASSESS but not Business Type`);
    }

    const now = Date.now() / 1000;
    if (now < proposal.assessEnd) {
        if (now > proposal.assessEnd - 86400) {
            strapi.services.notification.onProposalTimeAlarm(proposal);
        }
        return null;
    }

    strapi.log.info(`processProposalStatusAssess proposal.id=${id}`);

    let voteraState = await strapi.services.boaclient.getVoteraVoteState(proposal.proposalId);
    if (voteraState === ENUM_VOTE_STATE_ASSESSING) {
        strapi.log.info(`waitForProposalTransaction.countAssess proposal.id=${id}`);
        voteraState = await waitForProposalTransaction(voteraState, proposal, 'countAssess');
        if (voteraState === null) {
            strapi.log.info('waitForProposalTransaction.countAssess skip');
            return null;
        }

        if (voteraState === ENUM_VOTE_STATE_ASSESSING) {
            const transactionInfo = await strapi.services.boaclient.countAssess(proposal.proposalId);
            strapi.log.info(`waitForTransaction.countAssess proposal.id=${id}`);
            voteraState = await waitForTransaction(transactionInfo, proposal);
            await strapi.services.validator.syncAssessValidatorList(proposal);
            if (voteraState === ENUM_VOTE_STATE_ASSESSING || voteraState === null) {
                strapi.log.warn(
                    `processProposalStatusAssess proposal.id=${proposal.id} stopAt countAssess state=${voteraState}`,
                );
                return null;
            }
        }
    }

    return await checkCompleteAtStatusAssess(voteraState, proposal);
}

async function processProposalStatusPendingVote(id) {
    // 현재 PENDING_VOTE
    const proposal = await strapi.query('proposal').findOne({ id }, []);
    if (proposal?.status !== ENUM_PROPOSAL_STATUS_PENDING_VOTE) {
        return proposal;
    }

    const now = Date.now() / 1000;
    if (now < proposal.vote_start) {
        if (now > proposal.vote_start - 86400) {
            strapi.services.notification.onProposalTimeAlarm(proposal);
        }
        return null;
    }

    const voteraState = await strapi.services.boaclient.getVoteraVoteState(proposal.proposalId);
    if (voteraState === ENUM_VOTE_STATE_FINISHED) {
        return await changeProposalStatusFromTo(
            proposal,
            ENUM_PROPOSAL_STATUS_PENDING_VOTE,
            ENUM_PROPOSAL_STATUS_CLOSED,
        );
    } else if (voteraState !== ENUM_VOTE_STATE_RUNNING) {
        await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_PENDING_VOTE, ENUM_PROPOSAL_STATUS_CANCEL);
        throw new Error(
            `inconsistent proposalId:${proposal.proposalId} - expecting VoteraVote state=RUNNING but known state=${voteraState}`,
        );
    }

    return await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_PENDING_VOTE, ENUM_PROPOSAL_STATUS_VOTE);
}

async function getPlainBallot(proposal, sealKey, ballot) {
    const dbBallot = await strapi.query('ballot').findOne({ commitment: ballot.commitment });
    if (!dbBallot) {
        strapi.log.warn(
            `NotFoundBallot proposalId:${proposal.proposalId} validator=${ballot.key} commitment=${ballot.commitment}`,
        );
        return null;
    } else if (dbBallot.proposal?.id && proposal.id !== dbBallot.proposal.id) {
        strapi.log.warn(
            `MismatchBallot for commitment=${ballot.commitment} expecting proposal.id=${proposal.id} but found.id=${dbBallot.proposal.id}`,
        );
        return null;
    } else if (!dbBallot.member?.address) {
        strapi.log.warn(
            `MissingValue proposalId:${proposal.proposalId} commitment=${ballot.commitment} missing member.address`,
        );
        return null;
    }

    const value = strapi.services.boaclient.decryptBallot(sealKey, dbBallot.cipherText);
    if (!value) {
        strapi.log.warn(`DecryptFailed proposalId:${proposal.proposalId} commitment=${ballot.commitment}`);
        return null;
    } else if (value.choice === undefined || value.nonce === undefined) {
        strapi.log.warn(`DecryptInvalidValue proposalId:${proposal.proposalId} commitment=${ballot.commitment}`);
        return null;
    }

    return { validator: dbBallot.member.address, choice: value.choice, nonce: value.nonce };
}

async function selectProposalRevealBallots(id, pageIndex, pageSize) {
    const proposal = await strapi.query('proposal').findOne({ id }, []);
    if (proposal?.status !== ENUM_PROPOSAL_STATUS_VOTE) {
        return null;
    }

    const now = Date.now() / 1000;
    if (now < proposal.vote_end) {
        return null;
    }

    const sealKey = strapi.services.boaclient.getVoteBoxSealKey(proposal.proposalId);

    const validators = [];
    const choices = [];
    const nonces = [];
    let notFound = false;

    const ballotCount = await strapi.services.boaclient.getBallotCount(proposal.proposalId);
    const maxCount = Math.min(ballotCount, pageSize * (pageIndex + 1));
    for (let i = pageIndex * pageSize; i < maxCount; i += 1) {
        const ballot = await strapi.services.boaclient.getBallotAt(proposal.proposalId, i);
        if (ballot.nonce.isZero()) {
            const plainBallot = await getPlainBallot(proposal, sealKey, ballot);
            if (plainBallot) {
                validators.push(plainBallot.validator);
                choices.push(plainBallot.choice);
                nonces.push(plainBallot.nonce);
            } else {
                notFound = true;
            }
        }
    }

    return { validators, choices, nonces, notFound };
}

async function processProposalStatusVote(id) {
    // 현재 VOTE 확인
    const proposal = await strapi.query('proposal').findOne({ id }, ['transactions']);
    if (proposal?.status !== ENUM_PROPOSAL_STATUS_VOTE) {
        return proposal;
    }

    const now = Date.now() / 1000;
    if (now < proposal.vote_open) {
        if (now > proposal.vote_end - 86400) {
            strapi.services.notification.onProposalTimeAlarm(proposal);
        }
        return null;
    }

    strapi.log.info(`processProposalStatusVote proposal.id=${id}`);

    let voteraState = await strapi.services.boaclient.getVoteraVoteState(proposal.proposalId);

    if (voteraState === ENUM_VOTE_STATE_RUNNING) {
        strapi.log.info(`waitForProposalMiningTransaction.revealBallot proposal.id=${id}`);
        voteraState = await waitForProposalMiningTransaction(voteraState, proposal, 'revealBallot');
        if (voteraState === null) {
            strapi.log.info('waitForProposalMiningTransaction.revealBallot skip');
            return null;
        }
        strapi.log.info(`waitForProposalTransaction.countVote proposal.id=${id}`);
        voteraState = await waitForProposalTransaction(voteraState, proposal, 'countVote');
        if (voteraState === null) {
            strapi.log.info('waitForProposalTransaction.countVote skip');
            return null;
        }
    }

    if (voteraState === ENUM_VOTE_STATE_RUNNING) {
        const pageSize = strapi.config.boaclient.contract.revealBallotSize;
        if (pageSize <= 0) {
            throw new Error('invalid config boaclient.contract.revealBallotSize');
        }

        const ballotCount = await strapi.services.boaclient.getBallotCount(proposal.proposalId);
        const pageMax = Math.ceil(ballotCount / pageSize);
        // const txHashs = [];
        for (let i = 0; i < pageMax; i += 1) {
            const revealBallots = await selectProposalRevealBallots(proposal.id, i, pageSize);
            if (!revealBallots) {
                // it means it's not time for revealing vote
                strapi.log.info('selectProposalRevealBallots null - not time for revealing');
                return null;
            }

            const validators = revealBallots.validators;
            const choices = revealBallots.choices;
            const nonces = revealBallots.nonces;

            if (validators.length > 0) {
                const transInfo = await strapi.services.boaclient.revealBallot(
                    proposal.proposalId,
                    validators,
                    choices,
                    nonces,
                );

                for (let j = 0; j < validators.length; j += 1) {
                    const address = validators[j].toLowerCase();
                    const choice = choices[j];

                    await strapi.query('validator').update({ address, proposal: proposal.id }, { choice });
                }

                strapi.log.info(`waitForTransaction.revealBallot proposal.id=${id}`);
                await waitForTransaction(transInfo, proposal);
            }

            if (revealBallots.notFound) {
                strapi.log.error(`processProposalStatusVote proposal.id=${proposal.id} MissingBallotFound`);
                throw new Error(`MissingBallotFound proposalId:${proposal.proposalId}`);
            }
        }

        const transInfo = await strapi.services.boaclient.countVote(proposal.proposalId);
        strapi.log.info(`waitForTransaction.countVote proposal.id=${id}`);
        voteraState = await waitForTransaction(transInfo, proposal);
        await strapi.services.validator.syncBallotValidatorList(proposal);
        if (voteraState === ENUM_VOTE_STATE_RUNNING || voteraState === null) {
            strapi.log.warn(
                `processProposalStatusVote proposal.id=${proposal.id} stopAt countVote voteraState=${voteraState}`,
            );
            return null;
        }
    }

    if (voteraState === ENUM_VOTE_STATE_FINISHED) {
        return await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_VOTE, ENUM_PROPOSAL_STATUS_CLOSED);
    } else if (voteraState !== ENUM_VOTE_STATE_RUNNING) {
        await changeProposalStatusFromTo(proposal, ENUM_PROPOSAL_STATUS_VOTE, ENUM_PROPOSAL_STATUS_CANCEL);
        throw new Error(
            `inconsistent proposalId:${proposal.proposalId} - expecting VoteraVote state=RUNNING but known state=${voteraState}`,
        );
    }

    return null;
}

module.exports = {
    async createProposal(proposal) {
        /**
         * 1. 공지 Board 생성
         * 2. 논의하기 Board 생성
         * 3. 평가하기 Survey 생성
         * 4. 투표하기 Poll 생성
         */
        try {
            // data 유효성 확인
            if (proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS) {
                const proposalFee = await strapi.services.boaclient.getFundFeeAmount(proposal.fundingAmount);
                proposal.proposal_fee = proposalFee.toString();
            } else {
                proposal.fundingAmount = null;
                proposal.proposal_fee = null;
            }

            // initialize proposal other parameter
            proposal.status = ENUM_PROPOSAL_STATUS_CREATED;
            proposal.validators = null;
            proposal.signature = null;
            proposal.commonsBudgetAddress = strapi.services.boaclient.getCommonsBudgetContract().address;
            proposal.voteraVoteAddress = strapi.services.boaclient.getVoteraVoteContract().address;
            proposal.paidComplete = false;

            const { vote_start, vote_end } = getVotePeriod(proposal.votePeriod);
            proposal.vote_start = vote_start;
            proposal.vote_end = vote_end;
            proposal.vote_open = vote_end + strapi.config.votera.services.vote_open;
            const { assessStart, assessEnd } = getAssessPeriod(proposal);
            proposal.assessStart = assessStart;
            proposal.assessEnd = assessEnd;
            proposal.proposal_begin = await strapi.services.boaclient.getCurrentBlockHeight();

            for (;;) {
                const uId = `0x${crypto.randomBytes(32).toString('hex')}`;
                const uIdExists = await isProposalExists(uId);
                if (uIdExists) {
                    continue;
                }
                proposal.proposalId = uId;

                const hash = await getProposalDocHash(proposal);
                const hashExists = await isHashExists(hash);
                if (hashExists) {
                    continue;
                }
                proposal.doc_hash = hash;
                break;
            }

            const createdNotice = await createNotice(proposal);
            const createdDiscussion = await createDiscussion(proposal);
            const assess_activity = await createAssess(proposal);
            const vote_activity = await createVote(proposal);

            if (
                !createdNotice ||
                !createdDiscussion ||
                (proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS && !assess_activity) ||
                !vote_activity
            ) {
                throw strapi.errors.badImplementation('Create Proposal Error');
            }

            let activities = [createdNotice.id, createdDiscussion.id, vote_activity.id];
            if (proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS) {
                activities.push(assess_activity.id);
            }
            proposal.activities = activities;
            proposal.memberCount = 1;

            if (!proposal.attachment) {
                proposal.attachment = [];
            }
            proposal.validators = [];
            proposal.transactions = [];

            const createdProposal = await strapi.query('proposal').create(proposal);

            await strapi.query('member-role').create({
                member: proposal.creator,
                scope: ENUM_MEMBERROLE_SCOPE_PROPOSAL,
                status: ENUM_MEMBERROLE_STATUS_NORMAL,
                type: ENUM_MEMBERROLE_TYPE_ADMINISTRATOR,
                proposal: createdProposal.id,
            });

            return createdProposal;
        } catch (error) {
            strapi.log.warn('createProposal failed: proposal=%j\n%j', proposal, error);
            throw convertQueryOperationError(error);
        }
    },
    async joinProposal(id, member) {
        try {
            let proposal = await strapi.query('proposal').findOne({ id });
            if (!proposal) {
                throw strapi.errors.notFound('not found proposal');
            }

            try {
                const validValidator = await strapi.services.validator.isValidator(member.address);
                if (!validValidator) {
                    return { invalidValidator: true };
                }
            } catch (err) {
                strapi.log.warn(`joinProposal failed: invalidValidator member.id=${member.id}\n%j`, err);
                return { invalidValidator: true };
            }

            const joined = await this.checkJoinMember(proposal.id, member.id);
            if (!joined) {
                await strapi.query('member-role').create({
                    type: ENUM_MEMBERROLE_TYPE_USER,
                    scope: ENUM_MEMBERROLE_SCOPE_PROPOSAL,
                    proposal: proposal.id,
                    member: member.id,
                    status: ENUM_MEMBERROLE_STATUS_NORMAL,
                });
                proposal = await strapi.query('proposal').findOne({ id });
            }

            return { invalidValidator: false, proposal };
        } catch (error) {
            strapi.log.warn(`joinProposal failed : proposal.id=${id} member.id=${member.id}\n%j`, error);
            throw convertQueryOperationError(error);
        }
    },
    async confirmProposalCreator(proposal, user) {
        const { member, authorized } = await strapi.services.member.checkMemberUser(proposal.creator, user);
        if (!member) {
            throw strapi.errors.notFound('creator.notFound');
        } else if (!authorized) {
            throw strapi.errors.forbidden('Not Authorized');
        }
        if (proposal.proposer_address !== member.address) {
            throw strapi.errors.badRequest('proposer_address.invalid');
        }
        const voter_card = await strapi.services.member.getVoterCardFromInput(member.voterCard);
        return {
            member,
            voter_card,
        };
    },
    async batchJobForCreated() {
        if (!strapi.services.boaclient.isInitialized()) {
            return;
        }

        const limit = 100;

        for (let offset = 0; ; offset += 100) {
            const proposals = await strapi
                .query('proposal')
                .find({ status: ENUM_PROPOSAL_STATUS_CREATED, _start: offset, _limit: limit }, []);
            for (let i = 0; i < proposals.length; i += 1) {
                const proposal = proposals[i];
                try {
                    const r = await processProposalStatusCreated(proposal.id);
                    if (r && r.status !== ENUM_PROPOSAL_STATUS_CREATED) {
                        strapi.log.warn(`processStatusCreated.${r.proposalId} status=${r.status}`);
                        offset -= 1;
                    }
                } catch (err) {
                    strapi.log.warn(`batchJobForCreated failed : proposal.id=${proposal.id}\n%j`, err);
                }
            }
            if (proposals.length < limit) {
                break;
            }
        }
    },
    async batchJobForAssess() {
        if (!strapi.services.boaclient.isInitialized()) {
            return;
        }

        const limit = 100;

        for (let offset = 0; ; offset += 100) {
            const proposals = await strapi.query('proposal').find(
                {
                    status_in: [ENUM_PROPOSAL_STATUS_PENDING_ASSESS, ENUM_PROPOSAL_STATUS_ASSESS],
                    _start: offset,
                    _limit: limit,
                },
                [],
            );
            for (let i = 0; i < proposals.length; i += 1) {
                const proposal = proposals[i];
                try {
                    if (proposal.status === ENUM_PROPOSAL_STATUS_PENDING_ASSESS) {
                        const r = await processProposalStatusPendingAssess(proposal.id);
                        if (
                            r &&
                            r.status !== ENUM_PROPOSAL_STATUS_ASSESS &&
                            r.status !== ENUM_PROPOSAL_STATUS_PENDING_ASSESS
                        ) {
                            strapi.log.warn(`processPendingAssess.${r.proposalId} status=${r.status}`);
                            offset -= 1;
                        }
                    } else {
                        const r = await processProposalStatusAssess(proposal.id);
                        if (
                            r &&
                            r.status !== ENUM_PROPOSAL_STATUS_ASSESS &&
                            r.status !== ENUM_PROPOSAL_STATUS_PENDING_ASSESS
                        ) {
                            strapi.log.warn(`processAssess.${r.proposalId} status=${r.status}`);
                            offset -= 1;
                        }
                    }
                } catch (err) {
                    strapi.log.warn(`batchJobForAssess failed : proposal.id=${proposal.id}\n%j`, err);
                }
            }
            if (proposals.length < limit) {
                break;
            }
        }
    },
    async batchJobForVote() {
        if (!strapi.services.boaclient.isInitialized()) {
            return;
        }

        const limit = 100;

        for (let offset = 0; ; offset += 100) {
            const proposals = await strapi.query('proposal').find(
                {
                    status_in: [ENUM_PROPOSAL_STATUS_PENDING_VOTE, ENUM_PROPOSAL_STATUS_VOTE],
                    _start: offset,
                    _limit: limit,
                },
                [],
            );
            for (let i = 0; i < proposals.length; i += 1) {
                const proposal = proposals[i];
                try {
                    if (proposal.status === ENUM_PROPOSAL_STATUS_PENDING_VOTE) {
                        const r = await processProposalStatusPendingVote(proposal.id);
                        if (
                            r &&
                            r.status !== ENUM_PROPOSAL_STATUS_VOTE &&
                            r.status !== ENUM_PROPOSAL_STATUS_PENDING_VOTE
                        ) {
                            strapi.log.warn(`processPendingVote.${r.proposalId} status=${r.status}`);
                            offset -= 1;
                        }
                    } else {
                        const r = await processProposalStatusVote(proposal.id);
                        if (
                            r &&
                            r.status !== ENUM_PROPOSAL_STATUS_VOTE &&
                            r.status !== ENUM_PROPOSAL_STATUS_PENDING_VOTE
                        ) {
                            strapi.log.warn(`processVote.${r.proposalId} status=${r.status}`);
                            offset -= 1;
                        }
                    }
                } catch (err) {
                    strapi.log.warn(`batchJobForVote failed : proposal.id=${proposal.id}\n%j`, err);
                }
            }
            if (proposals.length < limit) {
                break;
            }
        }
    },
    async checkJoinMember(proposalId, memberId) {
        // 이미 join 되었는지 확인 (type, status 는 우선은 확인하지 않음)
        const found = await strapi.query('member-role').findOne(
            {
                scope: ENUM_MEMBERROLE_SCOPE_PROPOSAL,
                member: memberId,
                proposal: proposalId,
            },
            [],
        );
        return found ? true : false;
    },
    async proposalStatus(id, user) {
        let isLike = false;
        let isJoined = false;

        if (!user || !user.member?.id) {
            return { id, isJoined, isLike };
        }

        const founds = await strapi
            .query('interaction')
            .find({ type: ENUM_INTERACTION_TYPE_LIKE_PROPOSAL, proposal: id, actor: user.member.id }, []);
        for (let i = 0; i < founds?.length; i += 1) {
            const found = founds[i];
            if (found.type === ENUM_INTERACTION_TYPE_LIKE_PROPOSAL) {
                isLike = true;
            }
        }

        const roleFound = await strapi.query('member-role').findOne(
            {
                scope: ENUM_MEMBERROLE_SCOPE_PROPOSAL,
                member: user.member.id,
                status: ENUM_MEMBERROLE_STATUS_NORMAL,
                proposal: id,
            },
            [],
        );
        isJoined = !!roleFound;
        return { id, isLike, isJoined };
    },
    async listProposal(params, user) {
        const count = await strapi.query('proposal').count(params);
        const values = await strapi.query('proposal').find(params, []);
        const statuses = await Promise.all(values.map((value) => this.proposalStatus(value.id, user)));
        return { count, values, statuses };
    },
    async listJoinProposal(params, user) {
        const memberId = getValueId(user.member);
        const where = {
            'member_roles.scope': ENUM_MEMBERROLE_SCOPE_PROPOSAL,
            'member_roles.status': ENUM_MEMBERROLE_STATUS_NORMAL,
            'member_roles.member': memberId,
        };
        const count = await strapi.query('proposal').count({ _where: where });
        const values = await strapi.query('proposal').find({ ...params, _where: where }, []);
        const statuses = await Promise.all(values.map((value) => this.proposalStatus(value.id, user)));
        return { count, values, statuses };
    },
    async proposalFee(proposal) {
        try {
            const commonsBudget = strapi.services.boaclient.getCommonsBudgetContract();

            if (!commonsBudget) {
                throw new Error('not initialized commonsBudget');
            }
            const destination = commonsBudget.address;
            const feeAmount = await getFeeAmount(proposal);
            const response = {
                type: proposal.type,
                destination,
                feeAmount: feeAmount.toString(),
            };

            const methodName =
                proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS ? 'createFundProposal' : 'createSystemProposal';
            const transaction = findLastTransaction(proposal, methodName);

            if (proposal.status !== ENUM_PROPOSAL_STATUS_CREATED && transaction?.blockNumber) {
                response.status = ENUM_FEE_STATUS_PAID;
                return response;
            }

            const isExist = await strapi.services.boaclient.isCommonsBudgetProposalExist(proposal.proposalId);
            if (isExist) {
                if (transaction) {
                    if (transaction.blockNumber === 0) {
                        try {
                            const receipt = await strapi.services.boaclient.waitForTransactionReceipt(
                                transaction.transactionHash,
                            );
                            if (receipt) {
                                await strapi.services.transaction.updateWithReceipt(receipt);
                            }
                        } catch (error) {
                            strapi.log.warn(
                                `waitForTransactionReceipt exception for exist proposalId=${proposal.proposalId}`,
                            );
                        }
                    }
                }
                response.status = ENUM_FEE_STATUS_PAID;
                return response;
            }

            if (transaction) {
                if (transaction.blockNumber === 0) {
                    response.status = ENUM_FEE_STATUS_MINING;
                    return response;
                }
                if (transaction.status !== 0) {
                    strapi.log.error(
                        `proposal create transaction mismatch proposal.id=${proposal.id} transaction=${transaction.transactionHash}`,
                    );
                }
            }

            if (!proposal.proposer_address) {
                strapi.log.error(`proposalFee: id=${proposal.id} missing parameter`);
                return { status: ENUM_FEE_STATUS_INVALID };
            } else if (proposal.status !== ENUM_PROPOSAL_STATUS_CREATED) {
                strapi.log.error(`proposalFee: id=${proposal.id} invalid proposal status=${proposal.status}`);
                return { status: ENUM_FEE_STATUS_INVALID };
            }

            if (proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS) {
                if (!proposal.assessEnd) {
                    strapi.log.error(`proposalFee: id=${proposal.id} missing parameter`);
                    return { status: ENUM_FEE_STATUS_INVALID };
                }
                const now = Date.now() / 1000;
                if (proposal.assessEnd < now) {
                    response.status = ENUM_FEE_STATUS_EXPIRED;
                    return response;
                }

                response.status = ENUM_FEE_STATUS_WAIT;
                response.start = proposal.vote_start;
                response.end = proposal.vote_end;
                response.startAssess = proposal.assessStart;
                response.endAssess = proposal.assessEnd;
                response.amount = proposal.fundingAmount;
                response.docHash = proposal.doc_hash;
                response.title = proposal.name;
                response.signature = signProposal(proposal);
            } else {
                if (!proposal.vote_start) {
                    strapi.log.error(`proposalFee: id=${proposal.id} missing parameter`);
                    return { status: ENUM_FEE_STATUS_INVALID };
                }
                const now = Date.now() / 1000;
                if (proposal.vote_start < now) {
                    response.status = ENUM_FEE_STATUS_EXPIRED;
                    return response;
                }

                response.status = ENUM_FEE_STATUS_WAIT;
                response.start = proposal.vote_start;
                response.end = proposal.vote_end;
                response.docHash = proposal.doc_hash;
                response.title = proposal.name;
                response.signature = signProposal(proposal);
            }

            return response;
        } catch (error) {
            strapi.log.warn(`proposalFee failed: proposalId=${proposal.proposalId}\n%j`, error);
            throw convertQueryOperationError(error);
        }
    },
    async checkProposalFee(proposalInput, transactionHash) {
        const proposalId = proposalInput.proposalId;
        const id = proposalInput.id;
        let proposal = proposalInput;
        try {
            const methodName =
                proposal.type === ENUM_PROPOSAL_TYPE_BUSINESS ? 'createFundProposal' : 'createSystemProposal';
            let { transaction, created } = await strapi.services.transaction.findOrCreateWithProposal(
                { hash: transactionHash, method: methodName },
                proposal,
            );

            const receipt = await strapi.services.boaclient.getTransactionReceipt(transactionHash);
            if (receipt) {
                if (transaction.blockNumber !== receipt.blockNumber || transaction.status !== receipt.status) {
                    transaction = await strapi.services.transaction.updateWithReceipt(receipt);
                }

                const isExist = await strapi.services.boaclient.isCommonsBudgetProposalExist(proposalId);
                if (isExist) {
                    if (!proposal.paidComplete || proposal.createTx !== transactionHash) {
                        proposal = await strapi
                            .query('proposal')
                            .update({ id }, { paidComplete: true, createTx: transactionHash });
                    }
                    processProposalStatusCreated(id)
                        .then((updated) => {
                            strapi.log.debug(
                                `checkProposalFee.waitFor end proposalId=${proposalId} status=${updated?.status}`,
                            );
                        })
                        .catch((error) => {
                            strapi.log.warn(`checkProposalFee.1 failed: proposalId=${proposalId}\n%j`, error);
                        });
                    return { proposal, status: ENUM_FEE_STATUS_PAID };
                }

                if (proposal.paidComplete || proposal.createTx) {
                    proposal = await strapi.query('proposal').update({ id }, { paidComplete: false, createTx: '' });
                }
                return { proposal, status: receipt.status === 0 ? ENUM_FEE_STATUS_ERROR : ENUM_FEE_STATUS_WAIT };
            }

            if (proposal.paidComplete || proposal.createTx !== transactionHash) {
                proposal = await strapi
                    .query('proposal')
                    .update({ id }, { paidComplete: false, createTx: transactionHash });
            }
            if (created) {
                strapi.log.debug(`checkProposalFee.waitFor 1=waitForTransactionReceipt proposalId=${proposalId}`);
                strapi.services.boaclient
                    .waitForTransactionReceipt(transactionHash)
                    .then((receipt) => {
                        strapi.log.debug(`checkProposalFee.waitFor 2=updateWithReceipt proposalId=${proposalId}`);
                        return strapi.services.transaction.updateWithReceipt(receipt);
                    })
                    .then((transaction) => {
                        if (transaction) {
                            strapi.log.debug(
                                `checkProposalFee.waitFor 3=isCommonsBudgetProposalExist proposalId=${proposalId}`,
                            );
                            return strapi.services.boaclient.isCommonsBudgetProposalExist(proposalId);
                        }
                    })
                    .then((result) => {
                        if (result) {
                            strapi.log.debug(
                                `checkProposalFee.waitFor 4=processProposalStatusCreated proposalId=${proposalId}`,
                            );
                            return processProposalStatusCreated(id);
                        }
                    })
                    .then((updated) => {
                        strapi.log.debug(
                            `checkProposalFee.waitFor end proposalId=${proposalId} status=${updated?.status}`,
                        );
                    })
                    .catch((error) => {
                        if (error.transactionHash === transactionHash) {
                            strapi.services.transaction.recordFailedTransaction(error.transactionHash, error.reason);
                        }
                        strapi.log.warn(`checkProposalFee.2 failed: proposalId=${proposal.proposalId}\n%j`, error);
                    });
            }

            return { proposal, status: ENUM_FEE_STATUS_MINING };
        } catch (error) {
            strapi.log.warn(`checkProposalFee failed: proposalId=${proposal.proposalId}\n%j`, error);
            throw convertQueryOperationError(error);
        }
    },
    async findInfo(proposalHash) {
        let proposal = await strapi.query('proposal').findOne({ doc_hash: proposalHash });
        if (!proposal) return null;
        const proposalInfo = await getProposalInfo(proposal);
        return proposalInfo;
    },
    async feePolicy() {
        const policy = await strapi.services.boaclient.getFeePolicy();
        return policy;
    },
    async submitAssess(proposalId, content, transactionHash, member) {
        const proposal = await strapi.query('proposal').findOne({ proposalId }, ['activities.survey.questions']);
        if (!proposal) throw strapi.errors.notFound('notFound proposal');
        if (proposal.type !== ENUM_PROPOSAL_TYPE_BUSINESS) {
            throw strapi.errors.badRequest('not business proposal');
        }
        if (!transactionHash) {
            if (proposal.status !== ENUM_PROPOSAL_STATUS_ASSESS) throw strapi.errors.badRequest('not in assess');
            const now = Date.now() / 1000;
            if (now > proposal.assessEnd) throw strapi.errors.badRequest('past assessment');
        }

        const activity = proposal.activities.find(
            (a) => a.type === ENUM_ACTIVITY_TYPE_SURVEY && a.status === ENUM_ACTIVITY_STATUS_OPEN,
        );
        if (!activity) {
            throw new Error(`NotFound Survey for proposal:${proposalId}`);
        }

        const postContent = activity.survey?.questions
            ?.map((q) => {
                const foundContent = content.find((c) => c?.sequence === q?.sequence);
                if (foundContent) {
                    return {
                        __component: 'post.scale-answer',
                        value: foundContent.value,
                        sequence: q.sequence,
                        question: q.id,
                    };
                }
                return null;
            })
            .filter((c) => !!c);
        let post = await strapi.query('post').findOne({
            type: ENUM_POST_TYPE_SURVEY_RESPONSE,
            activity: activity.id,
            writer: member.id,
            status: ENUM_POST_STATUS_OPEN,
        });
        if (post) {
            await strapi.services.survey.subtractSurveyScaleResults(activity.survey?.id, post);

            post = await strapi.query('post').update({ id: post.id }, { content: postContent });
        } else {
            post = await strapi.query('post').create({
                type: ENUM_POST_TYPE_SURVEY_RESPONSE,
                content: postContent,
                activity: activity.id,
                writer: member.id,
                status: ENUM_POST_STATUS_OPEN,
            });
        }

        await strapi.services.survey.addSurveyScaleResults(activity.survey?.id, post);

        if (transactionHash) {
            await strapi.services.transaction.findOrCreateWithPost(
                { hash: transactionHash, method: 'submitAssess' },
                post,
            );

            strapi.services.transaction.updateReceipt(transactionHash).catch((error) => {
                strapi.log.warn(`submitAssess.updateTransaction failed transaionHash=${transactionHash}\n%j`, error);
            });
        }

        return post;
    },
    async assessResult(proposalId, actor) {
        let member = null;
        if (actor) {
            member = await strapi.query('member').findOne({ id: actor });
            if (!member) throw strapi.errors.notFound('not found memeber');
        }

        const proposal = await strapi.query('proposal').findOne({ proposalId }, ['activities.survey.scaleResults']);
        if (!proposal) throw strapi.errors.notFound('notFound Proposal');
        if (proposal.type !== ENUM_PROPOSAL_TYPE_BUSINESS) throw strapi.errors.badRequest('notFund proposal');
        if (proposal.status === ENUM_PROPOSAL_STATUS_CREATED) {
            return { proposalState: ENUM_ASSESS_PROPOSAL_STATE_INVALID };
        }

        const proposalData = await strapi.services.boaclient.getCommonsProposalData(proposalId);
        if (!proposalData) throw strapi.errors.notFound('notFound proposal in commonsBudget');
        if (proposalData.proposalType !== ENUM_BUDGET_TYPE_FUND)
            throw strapi.errors.badRequest('notFound fund proposal in commonsBudget');

        const isProposer = member ? proposalData.proposer?.toLowerCase() === member.address : false;
        const isValidVoter = member
            ? await strapi.services.boaclient.isContainValidator(proposalId, member.address)
            : false;

        if (proposalData.state == ENUM_BUDGET_STATE_CREATED) {
            let needEvaluation;
            if (isValidVoter) {
                const isContainAssess = await strapi.services.boaclient.isContainAssess(proposalId, member.address);
                needEvaluation = !isContainAssess;
            } else {
                needEvaluation = false;
            }
            // 아직 사전 평가 데이터가 등록이 되지 않았기 때문에 survey.scaleResults 에서 결과를 읽어온다.
            let assessParticipantSize = 0;
            const assessData = [0, 0, 0, 0, 0];

            const activity = proposal.activities.find(
                (a) => a.type === ENUM_ACTIVITY_TYPE_SURVEY && a.status === ENUM_ACTIVITY_STATUS_OPEN,
            );
            if (activity?.survey) {
                const survey = await strapi.query('survey').findOne({ id: activity.survey.id });
                survey?.scaleResults?.forEach((sr) => {
                    if (sr.sequence === 0) {
                        assessParticipantSize += sr.count;
                    } else if (sr.sequence > 4 || sr.sequence < 0) {
                        return;
                    }
                    assessData[sr.sequence] += sr.count * sr.value;
                });
            }

            return {
                isValidVoter,
                isProposer,
                needEvaluation,
                proposalState: ENUM_ASSESS_PROPOSAL_STATE_CREATED,
                assessParticipantSize: assessParticipantSize.toString(),
                assessData: assessData.map((d) => d.toString()),
            };
        } else {
            return {
                isValidVoter,
                isProposer,
                needEvaluation: false,
                proposalState:
                    proposalData.state === ENUM_BUDGET_STATE_REJECTED
                        ? ENUM_ASSESS_PROPOSAL_STATE_REJECTED
                        : ENUM_ASSESS_PROPOSAL_STATE_ACCEPTED,
                assessParticipantSize: proposalData.assessParticipantSize.toString(),
                assessData: proposalData.assessData.map((data) => data.toString()),
            };
        }
    },
    async voteStatus(proposalId, actor) {
        const voteState = await strapi.services.boaclient.getVoteraVoteState(proposalId);
        if (voteState === ENUM_VOTE_STATE_INVALID) throw strapi.errors.notFound('not found proposal');
        const proposalData = await strapi.services.boaclient.getCommonsProposalData(proposalId);
        if (!proposalData) throw strapi.errors.notFound('not found proposal');

        let isValidVoter = false;
        let isProposer = false;
        let needVote = false;

        if (actor) {
            const member = await strapi.query('member').findOne({ id: actor });
            if (!member) throw strapi.errors.notFound('not found memeber');
            isProposer =
                proposalData.proposalType === ENUM_BUDGET_TYPE_FUND
                    ? proposalData.proposer?.toLowerCase() === member.address
                    : false;
            isValidVoter = await strapi.services.boaclient.isContainValidator(proposalId, member.address);
            if (voteState === ENUM_VOTE_STATE_RUNNING) {
                const isContainBallot = await strapi.services.boaclient.isContainBallot(proposalId, member.address);
                needVote = isValidVoter && !isContainBallot;
            }
        }

        let voteProposalState;
        const proposalResult = proposalData.proposalResult;
        switch (proposalResult) {
            case ENUM_BUDGET_RESULT_NONE:
                voteProposalState =
                    voteState === ENUM_VOTE_STATE_RUNNING
                        ? ENUM_VOTE_PROPOSAL_STATE_RUNNING
                        : ENUM_VOTE_PROPOSAL_STATE_NONE;
                break;
            case ENUM_BUDGET_RESULT_APPROVED:
                if (proposalData.fundWithdrawn) {
                    voteProposalState = ENUM_VOTE_PROPOSAL_STATE_WITHDRAWN;
                } else if (!proposalData.fundingAllowed) {
                    voteProposalState = ENUM_VOTE_PROPOSAL_STATE_NOTALLOWED;
                } else {
                    voteProposalState = ENUM_VOTE_PROPOSAL_STATE_APPROVED;
                }
                break;
            case ENUM_BUDGET_RESULT_REJECTED:
                voteProposalState = ENUM_VOTE_PROPOSAL_STATE_REJECTED;
                break;
            case ENUM_BUDGET_RESULT_INVALID_QUORUM:
                voteProposalState = ENUM_VOTE_PROPOSAL_STATE_INVALID_QUORUM;
                break;
            case ENUM_BUDGET_RESULT_ASSESSMENT_FAILED:
                voteProposalState = ENUM_VOTE_PROPOSAL_STATE_ASSESSMENT_FAILED;
                break;
            default:
                throw new Error('unknown commons budget proposal result');
        }

        if (
            proposalResult === ENUM_BUDGET_RESULT_APPROVED ||
            proposalResult === ENUM_BUDGET_RESULT_REJECTED ||
            proposalResult === ENUM_BUDGET_RESULT_INVALID_QUORUM
        ) {
            const commonsBudget = strapi.services.boaclient.getCommonsBudgetContract();
            const countingFinishTime = proposalData.countingFinishTime.toNumber();
            const canWithdrawAt = countingFinishTime + strapi.config.votera.services.can_withdraw_after;
            return {
                isValidVoter,
                isProposer,
                needVote,
                voteProposalState,
                validatorSize: proposalData.validatorSize.toString(),
                voteResult: proposalData.voteResult.map((value) => value.toString()),
                destination: commonsBudget?.address,
                countingFinishTime,
                canWithdrawAt,
            };
        }

        return {
            isValidVoter,
            isProposer,
            needVote,
            voteProposalState,
        };
    },
    async voteCount(proposalId) {
        const proposal = await strapi.query('proposal').findOne({ proposalId }, []);
        if (!proposal) throw strapi.errors.notFound('not found proposal');
        const validatorCount = await strapi.services.boaclient.getValidatorCount(proposalId);
        const assessCount = await strapi.services.boaclient.getAssessCount(proposalId);
        const ballotCount = await strapi.services.boaclient.getBallotCount(proposalId);
        return { id: proposal.id, validatorCount, assessCount, ballotCount };
    },
    async noticeStatus(activityId, user) {
        if (!foundReadLatest) {
            chooseModelFunction();
        }

        const activity = await strapi.query('activity').findOne({ id: activityId }, []);
        if (!activity) throw strapi.errors.notFound('notFound activity');
        if (activity.type !== ENUM_ACTIVITY_TYPE_BOARD) throw strapi.errors.badRequest('invalid activity');

        if (!user || !user.member) {
            return { id: activity.id };
        }
        const memberId = getValueId(user.member);
        const lastUnreadAt = await foundUnreadLatest(activity.id, memberId);
        const lastUpdateAt = await foundReadLatest(activity.id, memberId);
        return { id: activity.id, lastUpdateAt, lastUnreadAt };
    },
};
