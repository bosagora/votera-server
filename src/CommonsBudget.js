/* eslint-disable camelcase */
/** Content Hash: 0x23b888d3cf482a2e53d1aaef1f3c48577cc48ed4468994d112628b31ace5e49b */
const { ethers } = require('ethers');

class CommonsBudget extends ethers.Contract {
    constructor(addressOrName, providerOrSigner) {
        super(addressOrName, new.target.ABI(), providerOrSigner);
    }

    connect(providerOrSigner) {
        return new this.constructor(this.address, providerOrSigner);
    }

    attach(addressOrName) {
        return new this.constructor(addressOrName, this.signer || this.provider);
    }

    allowFunding(_proposalID, _overrides) {
        return this['allowFunding(bytes32)'](_proposalID, _overrides);
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

    canDistributeVoteFees(_proposalID, _overrides) {
        return this['canDistributeVoteFees(bytes32)'](_proposalID, _overrides);
    }

    changeVoteParam(_voteManager, _voteAddress, _overrides) {
        return this['changeVoteParam(address,address)'](_voteManager, _voteAddress, _overrides);
    }

    checkWithdrawState(_proposalID, _overrides) {
        return this['checkWithdrawState(bytes32)'](_proposalID, _overrides);
    }

    createFundProposal(_proposalID, _proposalInput, _signature, _overrides) {
        return this['createFundProposal(bytes32,(uint64,uint64,uint64,uint64,uint256,bytes32,string),bytes)'](
            _proposalID,
            _proposalInput,
            _signature,
            _overrides,
        );
    }

    createSystemProposal(_proposalID, _proposalInput, _signature, _overrides) {
        return this['createSystemProposal(bytes32,(uint64,uint64,uint64,uint64,uint256,bytes32,string),bytes)'](
            _proposalID,
            _proposalInput,
            _signature,
            _overrides,
        );
    }

    distributeVoteFees(_proposalID, _start, _overrides) {
        return this['distributeVoteFees(bytes32,uint256)'](_proposalID, _start, _overrides);
    }

    finishVote(_proposalID, _validatorSize, _voteResult, _overrides) {
        return this['finishVote(bytes32,uint256,uint64[])'](_proposalID, _validatorSize, _voteResult, _overrides);
    }

    getProposalData(_proposalID, _overrides) {
        return this['getProposalData(bytes32)'](_proposalID, _overrides);
    }

    getProposalValues(_proposalID, _overrides) {
        return this['getProposalValues(bytes32)'](_proposalID, _overrides);
    }

    getStorageContractAddress(_overrides) {
        return this['getStorageContractAddress()'](_overrides);
    }

    isManager(account, _overrides) {
        return this['isManager(address)'](account, _overrides);
    }

    isOwner(account, _overrides) {
        return this['isOwner(address)'](account, _overrides);
    }

    manager(_overrides) {
        return this['manager()'](_overrides);
    }

    owner(_overrides) {
        return this['owner()'](_overrides);
    }

    refuseFunding(_proposalID, _overrides) {
        return this['refuseFunding(bytes32)'](_proposalID, _overrides);
    }

    renounceOwnership(_overrides) {
        return this['renounceOwnership()'](_overrides);
    }

    setManager(newManager, _overrides) {
        return this['setManager(address)'](newManager, _overrides);
    }

    supportsInterface(interfaceId, _overrides) {
        return this['supportsInterface(bytes4)'](interfaceId, _overrides);
    }

    transferOwnership(newOwner, _overrides) {
        return this['transferOwnership(address)'](newOwner, _overrides);
    }

    withdraw(_proposalID, _overrides) {
        return this['withdraw(bytes32)'](_proposalID, _overrides);
    }

    static factory(signer) {
        return new ethers.ContractFactory(CommonsBudget.ABI(), CommonsBudget.bytecode(), signer);
    }

    static bytecode() {
        return ethers.logger.throwError('no bytecode provided during generation', ethers.errors.UNSUPPORTED_OPERATION, {
            operation: 'contract.bytecode',
        });
    }

    static ABI() {
        return [
            'constructor()',
            'event AssessmentFinish(bytes32 proposalID, bool assessResult)',
            'event FundTransfer(bytes32 proposalID)',
            'event FundWithdrawAllow(bytes32 proposalID)',
            'event FundWithdrawRefuse(bytes32 proposalID)',
            'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
            'event Received(address, uint256)',
            'event VoteCountingFinish(bytes32 proposalID, bool countingResult)',
            'function allowFunding(bytes32 _proposalID)',
            'function assessProposal(bytes32 _proposalID, uint256 _validatorSize, uint256 _assessParticipantSize, uint64[] _assessData)',
            'function canDistributeVoteFees(bytes32 _proposalID) view returns (bool)',
            'function changeVoteParam(address _voteManager, address _voteAddress)',
            'function checkWithdrawState(bytes32 _proposalID) view returns (string code, uint256 countingFinishTime)',
            'function createFundProposal(bytes32 _proposalID, tuple(uint64 start, uint64 end, uint64 startAssess, uint64 endAssess, uint256 amount, bytes32 docHash, string title) _proposalInput, bytes _signature) payable',
            'function createSystemProposal(bytes32 _proposalID, tuple(uint64 start, uint64 end, uint64 startAssess, uint64 endAssess, uint256 amount, bytes32 docHash, string title) _proposalInput, bytes _signature) payable',
            'function distributeVoteFees(bytes32 _proposalID, uint256 _start)',
            'function finishVote(bytes32 _proposalID, uint256 _validatorSize, uint64[] _voteResult)',
            'function getProposalData(bytes32 _proposalID) view returns (tuple(uint8 state, uint8 proposalType, uint8 proposalResult, address proposer, string title, uint256 countingFinishTime, bool fundingAllowed, bool fundWithdrawn, uint64 start, uint64 end, uint64 startAssess, uint64 endAssess, bytes32 docHash, uint256 fundAmount, uint256 assessParticipantSize, uint64[] assessData, uint256 validatorSize, uint64[] voteResult, address voteAddress))',
            'function getProposalValues(bytes32 _proposalID) view returns (uint256)',
            'function getStorageContractAddress() view returns (address contractAddress)',
            'function isManager(address account) view returns (bool)',
            'function isOwner(address account) view returns (bool)',
            'function manager() view returns (address)',
            'function owner() view returns (address)',
            'function refuseFunding(bytes32 _proposalID)',
            'function renounceOwnership()',
            'function setManager(address newManager)',
            'function supportsInterface(bytes4 interfaceId) pure returns (bool)',
            'function transferOwnership(address newOwner)',
            'function withdraw(bytes32 _proposalID)',
        ];
    }
}

module.exports = {
    CommonsBudget,
};
