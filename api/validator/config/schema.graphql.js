'use strict';

module.exports = {
    definition: `
        type SignTypeDomain {
            name: String
            version: String
            chainId: Int
            verifyingContract: String
        }
        type IsValidatorPayload {
            valid: Boolean
            publicKey: String
        }
    `,
    query: `
        isValidator(address: String!): IsValidatorPayload
        getSignUpDomain: SignTypeDomain
        getSignInDomain: SignTypeDomain
        listAssessValidators(proposalId: String!, limit: Int, start: Int): [Validator]
        listBallotValidators(proposalId: String!, limit: Int, start: Int): [Validator]
    `,
    resolver: {
        Query: {
            isValidator: {
                description: 'check if validator or not',
                policies: ['rateLimit'],
                resolver: 'application::validator.validator.isValidator',
            },
            getSignUpDomain: {
                description: 'query domain for signUp',
                resolver: 'application::validator.validator.getSignUpDomain',
            },
            getSignInDomain: {
                description: 'query domain for signIn',
                resolver: 'application::validator.validator.getSignInDomain',
            },
            listAssessValidators: {
                description: 'list validators for assessment',
                resolver: 'application::validator.validator.listAssessValidators',
            },
            listBallotValidators: {
                description: 'list validators for vote',
                resolver: 'application::validator.validator.listBallotValidators',
            },
        },
    },
};
