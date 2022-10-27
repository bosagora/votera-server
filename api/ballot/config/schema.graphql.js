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
    `,
    mutation: `
        submitBallot(input: SubmitBallotInput!): SubmitBallotPayload
        recordBallot(input: RecordBallotInput!): RecordBallotPayload
    `,
    resolver: {
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
