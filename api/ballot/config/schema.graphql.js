'use strict';

module.exports = {
    definition: `
        input SubmitBallotInputData {
            proposalId: String!
            address: String!
            choice: Int!
        }
        input SubmitBallotInput {
            data: SubmitBallotInputData
        }
        type SubmitBallotPayload {
            commitment: String
            signature: String
            ballot: Ballot
        }
        input RecordBallotInputData {
            proposalId: String!
            address: String!
            commitment: String!
            transactionHash: String
        }
        input RecordBallotInput {
            data: RecordBallotInputData
        }
        type RecordBallotPayload {
            ballot: Ballot
        }
        type MyBallot {
            id: ID!
            choice: Int
            commitment: String
            transactionHash: String
            createdAt: DateTime!
        }
        type ListMyBallotsPayload {
            count: Int
            values: [MyBallot]
        }
    `,
    query: `
        listMyBallots(proposalId: String!, actor: String!, sort: String, limit: Int, start: Int): ListMyBallotsPayload
    `,
    mutation: `
        submitBallot(input: SubmitBallotInput!): SubmitBallotPayload
        recordBallot(input: RecordBallotInput!): RecordBallotPayload
    `,
    resolver: {
        Query: {
            listMyBallots: {
                description: 'List My Ballots after proposal closing',
                resolver: 'application::ballot.ballot.listMyBallots',
            },
        },
        Mutation: {
            submitBallot: {
                description: 'Submit Ballot for proposal to get commitment, signature',
                resolver: 'application::ballot.ballot.submitBallot',
            },
            recordBallot: {
                description: 'Record ballot transaction',
                resolver: 'application::ballot.ballot.recordBallot',
                transformOutput: (result) => ({ ballot: result }),
            },
        },
    },
};
