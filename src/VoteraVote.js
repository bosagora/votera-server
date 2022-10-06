/** Content Hash: 0xcf8868356e44c4fe28eb3fcd3fdf677e28f07a314f43c5b134aa0ea3e837e06e */
const { ethers } = require('ethers');

class VoteraVote extends ethers.Contract {
    constructor(addressOrName, providerOrSigner) {
        super(addressOrName, new.target.ABI(), providerOrSigner);
    }

    connect(providerOrSigner) {
        return new this.constructor(this.address, providerOrSigner);
    }

    attach(addressOrName) {
        return new this.constructor(addressOrName, this.signer || this.provider);
    }

    ASSESS_ITEM_SIZE(_overrides) {
        return this['ASSESS_ITEM_SIZE()'](_overrides);
    }

    addValidators(_proposalID, _validators, _finalized, _overrides) {
        return this['addValidators(bytes32,address[],bool)'](_proposalID, _validators, _finalized, _overrides);
    }

    changeCommonBudgetContract(_commonsBudgetAddress, _overrides) {
        return this['changeCommonBudgetContract(address)'](_commonsBudgetAddress, _overrides);
    }

    commonsBudgetAddress(_overrides) {
        return this['commonsBudgetAddress()'](_overrides);
    }

    countAssess(_proposalID, _overrides) {
        return this['countAssess(bytes32)'](_proposalID, _overrides);
    }

    countVote(_proposalID, _overrides) {
        return this['countVote(bytes32)'](_proposalID, _overrides);
    }

    getAssessAt(_proposalID, _index, _overrides) {
        return this['getAssessAt(bytes32,uint256)'](_proposalID, _index, _overrides);
    }

    getAssessCount(_proposalID, _overrides) {
        return this['getAssessCount(bytes32)'](_proposalID, _overrides);
    }

    getAssessResult(_proposalID, _overrides) {
        return this['getAssessResult(bytes32)'](_proposalID, _overrides);
    }

    getBallot(_proposalID, _validator, _overrides) {
        return this['getBallot(bytes32,address)'](_proposalID, _validator, _overrides);
    }

    getBallotAt(_proposalID, _index, _overrides) {
        return this['getBallotAt(bytes32,uint256)'](_proposalID, _index, _overrides);
    }

    getBallotCount(_proposalID, _overrides) {
        return this['getBallotCount(bytes32)'](_proposalID, _overrides);
    }

    getManager(_overrides) {
        return this['getManager()'](_overrides);
    }

    getValidatorAt(_proposalID, _index, _overrides) {
        return this['getValidatorAt(bytes32,uint256)'](_proposalID, _index, _overrides);
    }

    getValidatorCount(_proposalID, _overrides) {
        return this['getValidatorCount(bytes32)'](_proposalID, _overrides);
    }

    getVoteResult(_proposalID, _overrides) {
        return this['getVoteResult(bytes32)'](_proposalID, _overrides);
    }

    init(_proposalID, _useAssess, _startVote, _endVote, _startAssess, _endAssess, _overrides) {
        return this['init(bytes32,bool,uint64,uint64,uint64,uint64)'](
            _proposalID,
            _useAssess,
            _startVote,
            _endVote,
            _startAssess,
            _endAssess,
            _overrides,
        );
    }

    isContainAssess(_proposalId, _address, _overrides) {
        return this['isContainAssess(bytes32,address)'](_proposalId, _address, _overrides);
    }

    isContainBallot(_proposalID, _address, _overrides) {
        return this['isContainBallot(bytes32,address)'](_proposalID, _address, _overrides);
    }

    isContainValidator(_proposalID, _address, _overrides) {
        return this['isContainValidator(bytes32,address)'](_proposalID, _address, _overrides);
    }

    isValidatorListFinalized(_proposalID, _overrides) {
        return this['isValidatorListFinalized(bytes32)'](_proposalID, _overrides);
    }

    owner(_overrides) {
        return this['owner()'](_overrides);
    }

    renounceOwnership(_overrides) {
        return this['renounceOwnership()'](_overrides);
    }

    revealBallot(_proposalID, _validators, _choices, _nonces, _overrides) {
        return this['revealBallot(bytes32,address[],uint8[],uint256[])'](
            _proposalID,
            _validators,
            _choices,
            _nonces,
            _overrides,
        );
    }

    setupVoteInfo(_proposalID, _startVote, _endVote, _openVote, _info, _overrides) {
        return this['setupVoteInfo(bytes32,uint64,uint64,uint64,string)'](
            _proposalID,
            _startVote,
            _endVote,
            _openVote,
            _info,
            _overrides,
        );
    }

    submitAssess(_proposalID, _assess, _overrides) {
        return this['submitAssess(bytes32,uint64[])'](_proposalID, _assess, _overrides);
    }

    submitBallot(_proposalID, _commitment, _signature, _overrides) {
        return this['submitBallot(bytes32,bytes32,bytes)'](_proposalID, _commitment, _signature, _overrides);
    }

    transferOwnership(newOwner, _overrides) {
        return this['transferOwnership(address)'](newOwner, _overrides);
    }

    voteInfos(p0, _overrides) {
        return this['voteInfos(bytes32)'](p0, _overrides);
    }

    static factory(signer) {
        return new ethers.ContractFactory(VoteraVote.ABI(), VoteraVote.bytecode(), signer);
    }

    static bytecode() {
        return ethers.logger.throwError('no bytecode provided during generation', ethers.errors.UNSUPPORTED_OPERATION, {
            operation: 'contract.bytecode',
        });
    }

    static ABI() {
        return [
            'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
            'event VoteResultPublished(bytes32 _proposalID)',
            'function ASSESS_ITEM_SIZE() view returns (uint256)',
            'function addValidators(bytes32 _proposalID, address[] _validators, bool _finalized)',
            'function changeCommonBudgetContract(address _commonsBudgetAddress)',
            'function commonsBudgetAddress() view returns (address)',
            'function countAssess(bytes32 _proposalID)',
            'function countVote(bytes32 _proposalID)',
            'function getAssessAt(bytes32 _proposalID, uint256 _index) view returns (address)',
            'function getAssessCount(bytes32 _proposalID) view returns (uint256)',
            'function getAssessResult(bytes32 _proposalID) view returns (uint64[])',
            'function getBallot(bytes32 _proposalID, address _validator) view returns (tuple(address key, uint8 choice, uint256 nonce, bytes32 commitment))',
            'function getBallotAt(bytes32 _proposalID, uint256 _index) view returns (address)',
            'function getBallotCount(bytes32 _proposalID) view returns (uint256)',
            'function getManager() view returns (address)',
            'function getValidatorAt(bytes32 _proposalID, uint256 _index) view returns (address)',
            'function getValidatorCount(bytes32 _proposalID) view returns (uint256)',
            'function getVoteResult(bytes32 _proposalID) view returns (uint64[])',
            'function init(bytes32 _proposalID, bool _useAssess, uint64 _startVote, uint64 _endVote, uint64 _startAssess, uint64 _endAssess)',
            'function isContainAssess(bytes32 _proposalId, address _address) view returns (bool)',
            'function isContainBallot(bytes32 _proposalID, address _address) view returns (bool)',
            'function isContainValidator(bytes32 _proposalID, address _address) view returns (bool)',
            'function isValidatorListFinalized(bytes32 _proposalID) view returns (bool)',
            'function owner() view returns (address)',
            'function renounceOwnership()',
            'function revealBallot(bytes32 _proposalID, address[] _validators, uint8[] _choices, uint256[] _nonces)',
            'function setupVoteInfo(bytes32 _proposalID, uint64 _startVote, uint64 _endVote, uint64 _openVote, string _info)',
            'function submitAssess(bytes32 _proposalID, uint64[] _assess)',
            'function submitBallot(bytes32 _proposalID, bytes32 _commitment, bytes _signature)',
            'function transferOwnership(address newOwner)',
            'function voteInfos(bytes32) view returns (uint8 state, bool useAssess, address commonsBudgetAddress, uint64 startAssess, uint64 endAssess, uint64 startVote, uint64 endVote, uint64 openVote, string info)',
        ];
    }
}

module.exports = {
    VoteraVote,
};
