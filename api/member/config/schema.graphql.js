'use strict';

module.exports = {
    definition: `
        type checkDupUserNamePayload {
            username: String
            duplicated: Boolean
        }
        type SignTypeMemberPayload {
            jwt: String
            user: UsersPermissionsUser!
            push: Push
            feeds: FeedsStatus
        }
        input signInMemberData {
            address: String!
            signTime: String!
            signature: String!
        }
        input signInMemberInput {
            data: signInMemberData
        }
        input signUpMemberData {
            address: String!
            username: String!
            signTime: String!
            signature: String!
            pushToken: String
            locale: String
        }
        input signUpMemberInput {
            data: signUpMemberData
        }
    `,
    query: `
        checkDupUserName(username: String!): checkDupUserNamePayload
        myMembers: [Member]
        isMember(address: String!): Boolean
    `,
    mutation: `
        signInMember(input: signInMemberInput!): SignTypeMemberPayload
        signUpMember(input: signUpMemberInput!): SignTypeMemberPayload
    `,
    resolver: {
        Query: {
            checkDupUserName: {
                description: 'Check if username is duplicated',
                resolver: 'application::member.member.checkDupUserName',
            },
            myMembers: {
                description: 'Get members of current user',
                resolver: 'application::member.member.myMembers',
            },
            isMember: {
                description: 'Check address is enrolled or not',
                resolver: 'application::member.member.isMember',
            },
        },
        Mutation: {
            signInMember: {
                description: 'Sign-in member',
                resolver: 'application::member.member.signInMember',
            },
            signUpMember: {
                description: 'Sign-up member',
                resolver: 'application::member.member.signUpMember',
            },
        },
    },
};
