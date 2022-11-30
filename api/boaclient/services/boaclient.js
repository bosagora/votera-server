const { ethers, Wallet, BigNumber } = require('ethers');
const fsp = require('fs/promises');
const nacl = require('tweetnacl-bosagora');
const { blake2bInit, blake2bUpdate, blake2bFinal } = require('blakejs');
const { arrayify, hexlify } = require('ethers/lib/utils');
const stringify = require('fast-json-stable-stringify');
const moment = require('moment');
const { NonceManager } = require('@ethersproject/experimental');
const { CommonsBudget__factory, CommonsStorage__factory, VoteraVote__factory } = require('commons-budget-contract');
const { VoteBox } = require('../../../src/VoteBox');
const { ENUM_BUDGET_STATE_INVALID } = require('../../../src/types/CommonsBudgetType');
const { GasPriceManager } = require('../../../src/GasPriceManager');

async function readWalletJson(path) {
    return fsp.readFile(path);
}

module.exports = {
    async initialize() {
        if (!strapi.config.boaclient.providerUrl) {
            throw new Error('BOSAGORA initialize failed : missing url');
        }
        this.provider = ethers.getDefaultProvider(strapi.config.boaclient.providerUrl);

        if (strapi.config.boaclient.wallet.path && strapi.config.boaclient.wallet.password) {
            const walletJson = await readWalletJson(strapi.config.boaclient.wallet.path);
            const wallet = await Wallet.fromEncryptedJson(walletJson, strapi.config.boaclient.wallet.password);
            this.signer = new Wallet(wallet, this.provider);
        } else if (strapi.config.boaclient.wallet.voteKey) {
            this.signer = new Wallet(strapi.config.boaclient.wallet.voteKey, this.provider);
        } else {
            throw new Error('BOSAGORA initialize failed : missing wallet parameter (path, password)');
        }

        if (!strapi.config.boaclient.contract.commonsBudget || !strapi.config.boaclient.contract.voteraVote) {
            throw new Error('BOSAGORA initialize failed : missing contract address');
        }

        const commonsBudget = this.getCommonsBudgetContract();
        await this.getCommonsStorageContract();
        const voteraVote = this.getVoteraVoteContract();

        const agora = await strapi.services.agora.find();
        if (agora) {
            if (
                commonsBudget.address !== agora.commonsBudgetAddress ||
                voteraVote.address !== agora.voteraVoteAddress
            ) {
                await strapi.services.agora.createOrUpdate({
                    commonsBudgetAddress: commonsBudget.address,
                    voteraVoteAddress: voteraVote.address,
                });
            }
        }

        await this.getFeePolicy();
    },

    isInitialized() {
        return this.provider !== undefined;
    },

    async getCurrentBlockHeight() {
        return this.provider.getBlockNumber();
    },

    async getBalance(address) {
        return this.provider.getBalance(address);
    },

    getCommonsBudgetContract() {
        if (!this.commonsBudget) {
            this.commonsBudget = CommonsBudget__factory.connect(
                strapi.config.boaclient.contract.commonsBudget,
                this.signer,
            );
        }
        return this.commonsBudget;
    },

    async getCommonsStorageContract() {
        if (!this.commonsStorage) {
            const commonsBudget = this.getCommonsBudgetContract();
            const storageAddress = await commonsBudget.getStorageContractAddress({});
            this.commonsStorage = CommonsStorage__factory.connect(storageAddress, this.signer);
        }
        return this.commonsStorage;
    },

    getVoteraVoteContract() {
        if (!this.voteraVote) {
            const voteraSigner = new NonceManager(new GasPriceManager(this.signer));
            this.voteraVote = VoteraVote__factory.connect(strapi.config.boaclient.contract.voteraVote, voteraSigner);
        }
        return this.voteraVote;
    },

    async isCommonsBudgetProposalExist(proposalId) {
        const proposal = await this.commonsBudget.getProposalData(proposalId, {});
        return proposal.state != ENUM_BUDGET_STATE_INVALID;
    },

    async getVoteraVoteState(proposalId) {
        const voteInfo = await this.voteraVote.voteInfos(proposalId, {});
        return voteInfo.state;
    },

    async getCommonsBudgetProposalState(proposalId) {
        const proposal = await this.commonsBudget.getProposalData(proposalId, {});
        return proposal.state;
    },

    signSystemProposal(proposalId, title, start, end, docHash) {
        const encodedResult = ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'string', 'uint64', 'uint64', 'bytes32'],
            [proposalId, title, start, end, docHash],
        );
        const sig = this.signer._signingKey().signDigest(ethers.utils.keccak256(encodedResult));
        return ethers.utils.joinSignature(sig);
    },

    signFundProposal(proposalId, title, start, end, startAssess, endAssess, docHash, amount, proposer) {
        const encodedResult = ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'string', 'uint64', 'uint64', 'uint64', 'uint64', 'bytes32', 'uint256', 'address'],
            [proposalId, title, start, end, startAssess, endAssess, docHash, amount, proposer],
        );
        const sig = this.signer._signingKey().signDigest(ethers.utils.keccak256(encodedResult));
        return ethers.utils.joinSignature(sig);
    },

    async getTransactionReceipt(hash) {
        const receipt = await this.provider.getTransactionReceipt(hash);
        return receipt;
    },

    async waitForTransactionReceipt(transactionHash) {
        let receipt = await this.provider.getTransactionReceipt(transactionHash);
        if (!receipt) {
            try {
                receipt = await this.provider.waitForTransaction(
                    transactionHash,
                    1,
                    strapi.config.boaclient.transaction_wait,
                );
            } catch (error) {
                if (error.transactionHash === transactionHash && error.receipt) {
                    receipt = error.receipt;
                } else {
                    throw error;
                }
            }
        }
        return receipt;
    },

    skipTransaction(transaction) {
        if (!transaction?.createdAt) {
            return false;
        }
        const createdAt = moment(transaction.createdAt).valueOf();
        return Date.now() - createdAt < strapi.config.boaclient.transaction_retry_after;
    },

    async setupVoteInfo(proposalId, startTime, endTime, openTime, info) {
        const voteraVote = this.getVoteraVoteContract();
        const tx = await voteraVote.setupVoteInfo(proposalId, startTime, endTime, openTime, info, {});
        return { hash: tx.hash, method: 'setupVoteInfo' };
    },

    async addValidators(proposalId, validators, finalized) {
        const voteraVote = this.getVoteraVoteContract();
        const tx = await voteraVote.addValidators(proposalId, validators, finalized, {});
        return { hash: tx.hash, method: 'addValidators' };
    },

    async isContainValidator(proposalId, address) {
        const voteraVote = this.getVoteraVoteContract();
        return await voteraVote.isContainValidator(proposalId, address, {});
    },

    async getValidatorCount(proposalId) {
        const voteraVote = this.getVoteraVoteContract();
        const count = await voteraVote.getValidatorCount(proposalId, {});
        return count.toNumber();
    },

    async getAssessCount(proposalId) {
        const voteraVote = this.getVoteraVoteContract();
        const count = await voteraVote.getAssessCount(proposalId, {});
        return count.toNumber();
    },

    async getAssessAt(proposalId, index) {
        const voteraVote = this.getVoteraVoteContract();
        return await voteraVote.getAssessAt(proposalId, index, {});
    },

    async isContainAssess(proposalId, address) {
        const voteraVote = this.getVoteraVoteContract();
        return await voteraVote.isContainAssess(proposalId, address, {});
    },

    async countAssess(proposalId) {
        const voteraVote = this.getVoteraVoteContract();
        const tx = await voteraVote.countAssess(proposalId, {});
        return { hash: tx.hash, method: 'countAssess' };
    },

    async isContainBallot(proposalId, address) {
        const voteraVote = this.getVoteraVoteContract();
        return await voteraVote.isContainBallot(proposalId, address, {});
    },

    async getBallotCount(proposalId) {
        const voteraVote = this.getVoteraVoteContract();
        const count = await voteraVote.getBallotCount(proposalId, {});
        return count.toNumber();
    },

    async getBallotAt(proposalId, index) {
        const voteraVote = this.getVoteraVoteContract();
        const address = await voteraVote.getBallotAt(proposalId, index, {});
        const ballot = await voteraVote.getBallot(proposalId, address, {});
        return ballot;
    },

    async getBallotAddressAt(proposalId, index) {
        const voteraVote = this.getVoteraVoteContract();
        return await voteraVote.getBallotAt(proposalId, index, {});
    },

    async revealBallot(proposalId, validators, choices, nonces) {
        const voteraVote = this.getVoteraVoteContract();
        const tx = await voteraVote.revealBallot(proposalId, validators, choices, nonces, {});
        return { hash: tx.hash, method: 'revealBallot' };
    },

    async countVote(proposalId) {
        const voteraVote = this.getVoteraVoteContract();
        const tx = await voteraVote.countVote(proposalId, {});
        return { hash: tx.hash, method: 'countVote' };
    },

    getVoteBoxSealKey(proposalId) {
        // proposalId is bytes32 type
        const key = Buffer.from(strapi.config.boaclient.hmacKey, 'utf8');
        const context = blake2bInit(nacl.sign.seedLength, key);
        blake2bUpdate(context, arrayify(this.signer.privateKey));
        blake2bUpdate(context, arrayify(proposalId));
        const seed = blake2bFinal(context);
        return nacl.sign.keyPair.fromSeed(seed);
    },

    encryptBallot(publicKey, choice, nonce) {
        const value = { choice, nonce: nonce.toString() };
        const message = Buffer.from(stringify(value), 'utf8');
        return hexlify(VoteBox.sealMake(message, publicKey));
    },

    decryptBallot(sealKey, cipherText) {
        if (!cipherText) return null;
        const cipher = arrayify(cipherText);
        const message = VoteBox.sealOpen(cipher, sealKey.publicKey, sealKey.secretKey);
        if (!message) return null;
        const value = JSON.parse(Buffer.from(message).toString('utf8'));
        return { choice: value?.choice, nonce: value?.nonce ? BigNumber.from(value.nonce) : undefined };
    },

    async getProposalDocHash(proposalInfoJson) {
        /**
         * proposalInfo {
         *  proposalId: string;
         *  name: string;
         *  description: string;
         *  type: string;
         *  fundingAmount: string;
         *  logo: { name, url, size, doc_hash, }
         *  attachment: [ { name, url, size, doc_hash, } ]
         *  vote_start: number
         *  vote_end: number
         * }
         */
        return ethers.utils.keccak256(Buffer.from(proposalInfoJson, 'utf8'));
    },

    async getCommonsProposalData(proposalId) {
        const proposal = await this.commonsBudget.getProposalData(proposalId, {});
        return proposal.state !== ENUM_BUDGET_STATE_INVALID ? proposal : null;
    },

    makeCommitment(proposalId, sender, choice, nonce) {
        const encodedResult = ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'uint8', 'uint256'],
            [proposalId, sender, choice, nonce],
        );
        return ethers.utils.keccak256(encodedResult);
    },

    signCommitment(proposalId, sender, commitment) {
        const encodedResult = ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'bytes32'],
            [proposalId, sender, commitment],
        );
        const sig = this.signer._signingKey().signDigest(ethers.utils.keccak256(encodedResult));
        return ethers.utils.joinSignature(sig);
    },

    async getBlockTimestamp(blockNumber) {
        const block = await this.provider.getBlock(blockNumber);
        return block?.timestamp;
    },

    async getFeePolicy() {
        if (!this.feePolicy) {
            const storageContract = await this.getCommonsStorageContract();
            const fundProposalFeePermil = await storageContract.fundProposalFeePermil({});
            const systemProposalFee = await storageContract.systemProposalFee({});
            const voterFee = await storageContract.voterFee({});
            const withdrawDelayPeriod = await storageContract.withdrawDelayPeriod({});
            this.feePolicy = {
                fundProposalFeePermil: BigNumber.from(fundProposalFeePermil).toString(),
                systemProposalFee: systemProposalFee.toString(),
                voterFee: voterFee.toString(),
                withdrawDelayPeriod,
            };
        }
        return this.feePolicy;
    },

    async getFundFeeAmount(amount) {
        const feePolicy = await this.getFeePolicy();
        return BigNumber.from(feePolicy.fundProposalFeePermil).mul(amount).div(1000);
        // const storageContract = await this.getCommonsStorageContract();
        // const proposalFeePermil = await storageContract.fundProposalFeePermil({});
        // return BigNumber.from(proposalFeePermil).mul(amount).div(1000);
    },

    async getSystemProposalFee() {
        const feePolicy = await this.getFeePolicy();
        return BigNumber.from(feePolicy.systemProposalFee);
        // const storageContract = await this.getCommonsStorageContract();
        // const systemProposalFee = await storageContract.systemProposalFee({});
        // return systemProposalFee;
    },
};
