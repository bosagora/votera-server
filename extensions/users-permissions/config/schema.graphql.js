'use strict';

module.exports = {
    definition: `
        type UsersPermissionsMeEx {
            id: ID!
            username: String!
            email: String!
            confirmed: Boolean
            blocked: Boolean
            role: UsersPermissionsMeRole
            member: Member
            user_feed: UserFeed
        }
        input UserPushTokenInput {
            pushId: ID
            pushToken: String
            isActive: Boolean
            locale: String
        }
        input updateUserPushTokenInput {
            where: InputID
            data: UserPushTokenInput
        }
        input AlarmStatus {
            myProposalsNews: Boolean
            likeProposalsNews: Boolean
            newProposalsNews: Boolean
            myCommentsNews: Boolean
            etcNews: Boolean
        }
        input UserAlarmStatusInput {
            alarmStatus: AlarmStatus
        }
        input updateUserAlarmStatusInput {
            where: InputID
            data: UserAlarmStatusInput
        }
    `,
    query: `
        meEx: UsersPermissionsMeEx
    `,
    mutation: `
        updateUserPushToken(input: updateUserPushTokenInput!): updateUserFeedPayload
        updateUserAlarmStatus(input: updateUserAlarmStatusInput!): updateUserFeedPayload
    `,
    resolver: {
        Query: {
            meEx: {
                resolver: 'plugins::users-permissions.user.me',
            },
        },
        Mutation: {
            updateUserPushToken: {
                description: 'Update pushToken and locale of user',
                resolver: 'plugins::users-permissions.user.updateUserPushToken',
                transformOutput: (result) => ({ userFeed: result }),
            },
            updateUserAlarmStatus: {
                description: 'Update alarm status of user',
                resolver: 'plugins::users-permissions.user.updateUserAlarmStatus',
                transformOutput: (result) => ({ userFeed: result }),
            },
        },
    },
};
