'use strict';

module.exports = {
    definition: `
        enum ENUM_FEE_STATUS {
            WAIT
            MINING
            PAID
            EXPIRED
            INVALID
            IRRELEVANT
        }
        type ProposalFeePayload {
            status: ENUM_FEE_STATUS
            type: ENUM_PROPOSAL_TYPE
            destination: String
            start: Int
            end: Int
            startAssess: Int
            endAssess: Int
            amount: String
            docHash: String
            title: String
            signature: String
            feeAmount: String
        }
        input JoinProposalInputData {
            id: ID!
            actor: ID!
        }
        input JoinProposalInput {
            data: JoinProposalInputData
        }
        type JoinProposalPayload {
            invalidValidator: Boolean
            proposal: Proposal
        }
        type VotePeriodPayload {
            begin: DateTime
            end: DateTime
        }
        type ProposalStatus {
            id: ID!
            isJoined: Boolean
            isLike: Boolean
        }
        type ListProposalPayload {
            count: Int
            values: [Proposal]
            statuses: [ProposalStatus]
        }
        input CheckProposalFeeInputData {
            proposalId: String!
            transactionHash: String!
        }
        input CheckProposalFeeInput {
            data: CheckProposalFeeInputData
        }
        type CheckProposalFeePayload {
            proposal: Proposal
            status: ENUM_FEE_STATUS
        }
        type FeePolicyPayload {
            fundProposalFeePermil: String
            systemProposalFee: String
            voterFee: String
            withdrawDelayPeriod: Int
        }
        input SubmitAssessInputData {
            proposalId: String!
            content: [PostContentDynamicZoneInput]
            transactionHash: String
        }
        input SubmitAssessInput {
            data: SubmitAssessInputData
        }
        type SubmitAssessPayload {
            post: Post
        }
        enum ENUM_ASSESS_PROPOSAL_STATE {
            INVALID
            CREATED
            REJECTED
            ACCEPTED
        }
        type AssessResultPayload {
            isValidVoter: Boolean
            isProposer: Boolean
            needEvaluation: Boolean
            proposalState: ENUM_ASSESS_PROPOSAL_STATE
            assessParticipantSize: String
            assessData: [String]
        }
        enum ENUM_VOTE_PROPOSAL_STATE {
            NONE
            RUNNING
            APPROVED
            WITHDRAWN
            REJECTED
            INVALID_QUORUM
            ASSESSMENT_FAILED
        }
        type VoteStatusPayload {
            isValidVoter: Boolean
            isProposer: Boolean
            needVote: Boolean
            voteProposalState: ENUM_VOTE_PROPOSAL_STATE
            validatorSize: String
            voteResult: [String]
            destination: String
            countingFinishTime: Int
            canWithdrawAt: Int
        }
        type VoteCountPayload {
            id: ID!
            validatorCount: Int
            assessCount: Int
            ballotCount: Int
        }
    `,
    query: `
        proposalById(proposalId: String!): Proposal
        proposalByActivity(activityId: String!): Proposal
        proposalStatusById(proposalId: String!): ProposalStatus
        proposalStatusByActivity(activityId: String!): ProposalStatus
        proposalFee(proposalId: String!): ProposalFeePayload
        checkProposalFee(proposalId: String!, transactionHash: String!): CheckProposalFeePayload
        listProposal(where: JSON, sort: String, limit: Int, start: Int): ListProposalPayload
        feePolicy: FeePolicyPayload
        assessResult(proposalId: String!, actor: String): AssessResultPayload
        voteStatus(proposalId: String!, actor: String): VoteStatusPayload
        voteCount(proposalId: String!): VoteCountPayload
    `,
    mutation: `
        joinProposal(input: JoinProposalInput!): JoinProposalPayload
        submitAssess(input: SubmitAssessInput!): SubmitAssessPayload
    `,
    resolver: {
        Query: {
            proposalById: {
                description: 'Get a API Proposal by proposalId',
                resolver: 'application::proposal.proposal.findById',
            },
            proposalByActivity: {
                description: 'Get a API Proposal by activityId',
                resolver: 'application::proposal.proposal.findByActivity',
            },
            proposalStatusById: {
                description: 'Get a status for proposal by proposalId',
                resolver: 'application::proposal.proposal.statusById',
            },
            proposalStatusByActivity: {
                description: 'Get a status for proposal by activityId',
                resolver: 'application::proposal.proposal.statusByActivity',
            },
            proposalFee: {
                description: 'Get Proposal Fee',
                resolver: 'application::proposal.proposal.proposalFee',
            },
            checkProposalFee: {
                description: 'Check proposal fee status',
                resolver: 'application::proposal.proposal.checkProposalFee',
            },
            listProposal: {
                description: 'Query proposal',
                resolver: 'application::proposal.proposal.listProposal',
            },
            feePolicy: {
                description: 'Query Policy of Fee',
                resolver: 'application::proposal.proposal.feePolicy',
            },
            assessResult: {
                description: 'Query Assess Result of proposal',
                resolver: 'application::proposal.proposal.assessResult',
            },
            voteStatus: {
                description: 'Query vote status for validator',
                resolver: 'application::proposal.proposal.voteStatus',
            },
            voteCount: {
                description: 'Query vote count of contract',
                resolver: 'application::proposal.proposal.voteCount',
            },
        },
        Mutation: {
            createProposal: {
                description: 'Create a new Proposal',
                resolver: 'application::proposal.proposal.create',
                transformOutput: (result) => ({ proposal: result }),
            },
            joinProposal: {
                description: 'Join Proposal',
                resolver: 'application::proposal.proposal.joinProposal',
            },
            submitAssess: {
                description: 'Submit Assess for proposal',
                resolver: 'application::proposal.proposal.submitAssess',
                transformOutput: (result) => ({ post: result }),
            },
        },
    },
};
