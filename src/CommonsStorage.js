/* eslint-disable camelcase */
/** Content Hash: 0x28d0e56444fb6ebbe5def74c3cb0f7b31e0f7d7107e7f8d3a264e01de23bded4 */
const { ethers } = require('ethers');

class CommonsStorage extends ethers.Contract {
    constructor(addressOrName, providerOrSigner) {
        super(addressOrName, new.target.ABI(), providerOrSigner);
    }

    connect(providerOrSigner) {
        return new this.constructor(this.address, providerOrSigner);
    }

    attach(addressOrName) {
        return new this.constructor(addressOrName, this.signer || this.provider);
    }

    approvalDiffPercent(_overrides) {
        return this['approvalDiffPercent()'](_overrides);
    }

    assessProposal(_proposalID, _validatorSize, _assessParticipantSize, _assessData, _overrides) {
        return this['assessProposal(bytes32,uint256,uint256,uint64[])'](
            _proposalID,
            _validatorSize,
            _assessParticipantSize,
            _assessData,
            _overrides,
        );
    }

    changeVoteParam(_voteManager, _voteAddress, _overrides) {
        return this['changeVoteParam(address,address)'](_voteManager, _voteAddress, _overrides);
    }

    checkWithdrawState(_proposalID, requestAddress, _overrides) {
        return this['checkWithdrawState(bytes32,address)'](_proposalID, requestAddress, _overrides);
    }

    createFundProposal(_proposalID, proposer, _proposalInput, _signature, _overrides) {
        return this['createFundProposal(bytes32,address,(uint64,uint64,uint64,uint64,uint256,bytes32,string),bytes)'](
            _proposalID,
            proposer,
            _proposalInput,
            _signature,
            _overrides,
        );
    }

    createSystemProposal(_proposalID, proposer, _proposalInput, _signature, _overrides) {
        return this['createSystemProposal(bytes32,address,(uint64,uint64,uint64,uint64,uint256,bytes32,string),bytes)'](
            _proposalID,
            proposer,
            _proposalInput,
            _signature,
            _overrides,
        );
    }

    finishVote(_proposalID, _validatorSize, _voteResult, _overrides) {
        return this['finishVote(bytes32,uint256,uint64[])'](_proposalID, _validatorSize, _voteResult, _overrides);
    }

    fundProposalFeePermil(_overrides) {
        return this['fundProposalFeePermil()'](_overrides);
    }

    getProposalData(_proposalID, _overrides) {
        return this['getProposalData(bytes32)'](_proposalID, _overrides);
    }

    maxVoteFee(_overrides) {
        return this['maxVoteFee()'](_overrides);
    }

    setFundProposalFeePermil(_value, _overrides) {
        return this['setFundProposalFeePermil(uint32)'](_value, _overrides);
    }

    setFundingAllowed(_proposalID, allow, _overrides) {
        return this['setFundingAllowed(bytes32,bool)'](_proposalID, allow, _overrides);
    }

    setSystemProposalFee(_value, _overrides) {
        return this['setSystemProposalFee(uint256)'](_value, _overrides);
    }

    setVoteQuorumFactor(_value, _overrides) {
        return this['setVoteQuorumFactor(uint32)'](_value, _overrides);
    }

    setVoterFee(_value, _overrides) {
        return this['setVoterFee(uint256)'](_value, _overrides);
    }

    setWithdrawDelayPeriod(_value, _overrides) {
        return this['setWithdrawDelayPeriod(uint32)'](_value, _overrides);
    }

    setWithdrawn(_proposalID, _overrides) {
        return this['setWithdrawn(bytes32)'](_proposalID, _overrides);
    }

    systemProposalFee(_overrides) {
        return this['systemProposalFee()'](_overrides);
    }

    transferOwnership(newOwner, _overrides) {
        return this['transferOwnership(address)'](newOwner, _overrides);
    }

    voteAddress(_overrides) {
        return this['voteAddress()'](_overrides);
    }

    voteFeeDistribCount(_overrides) {
        return this['voteFeeDistribCount()'](_overrides);
    }

    voteManager(_overrides) {
        return this['voteManager()'](_overrides);
    }

    voteQuorumFactor(_overrides) {
        return this['voteQuorumFactor()'](_overrides);
    }

    voterFee(_overrides) {
        return this['voterFee()'](_overrides);
    }

    withdrawDelayPeriod(_overrides) {
        return this['withdrawDelayPeriod()'](_overrides);
    }

    static factory(signer) {
        return new ethers.ContractFactory(CommonsStorage.ABI(), CommonsStorage.bytecode(), signer);
    }

    static bytecode() {
        return ethers.logger.throwError('no bytecode provided during generation', ethers.errors.UNSUPPORTED_OPERATION, {
            operation: 'contract.bytecode',
        });
    }

    static ABI() {
        return [
            'constructor(address _owner, address _budgetAddress)',
            'function approvalDiffPercent() view returns (uint256)',
            'function assessProposal(bytes32 _proposalID, uint256 _validatorSize, uint256 _assessParticipantSize, uint64[] _assessData) returns (bool)',
            'function changeVoteParam(address _voteManager, address _voteAddress)',
            'function checkWithdrawState(bytes32 _proposalID, address requestAddress) view returns (string code)',
            'function createFundProposal(bytes32 _proposalID, address proposer, tuple(uint64 start, uint64 end, uint64 startAssess, uint64 endAssess, uint256 amount, bytes32 docHash, string title) _proposalInput, bytes _signature)',
            'function createSystemProposal(bytes32 _proposalID, address proposer, tuple(uint64 start, uint64 end, uint64 startAssess, uint64 endAssess, uint256 amount, bytes32 docHash, string title) _proposalInput, bytes _signature)',
            'function finishVote(bytes32 _proposalID, uint256 _validatorSize, uint64[] _voteResult) returns (bool)',
            'function fundProposalFeePermil() view returns (uint32)',
            'function getProposalData(bytes32 _proposalID) view returns (tuple(uint8 state, uint8 proposalType, uint8 proposalResult, address proposer, string title, uint256 countingFinishTime, bool fundingAllowed, bool fundWithdrawn, uint64 start, uint64 end, uint64 startAssess, uint64 endAssess, bytes32 docHash, uint256 fundAmount, uint256 assessParticipantSize, uint64[] assessData, uint256 validatorSize, uint64[] voteResult, address voteAddress))',
            'function maxVoteFee() view returns (uint256)',
            'function setFundProposalFeePermil(uint32 _value)',
            'function setFundingAllowed(bytes32 _proposalID, bool allow)',
            'function setSystemProposalFee(uint256 _value)',
            'function setVoteQuorumFactor(uint32 _value)',
            'function setVoterFee(uint256 _value)',
            'function setWithdrawDelayPeriod(uint32 _value)',
            'function setWithdrawn(bytes32 _proposalID)',
            'function systemProposalFee() view returns (uint256)',
            'function transferOwnership(address newOwner)',
            'function voteAddress() view returns (address)',
            'function voteFeeDistribCount() view returns (uint256)',
            'function voteManager() view returns (address)',
            'function voteQuorumFactor() view returns (uint32)',
            'function voterFee() view returns (uint256)',
            'function withdrawDelayPeriod() view returns (uint32)',
        ];
    }
}

module.exports = {
    CommonsStorage,
};
