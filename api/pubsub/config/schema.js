const { withFilter } = require('apollo-server-koa');

module.exports = {
    definition: `
        enum ENUM_NOTIFICATION_TYPE {
            NEW_PROPOSAL
            ASSESS_24HR_DEADLINE
            ASSESS_CLOSED
            VOTING_START
            VOTING_24HR_DEADLINE
            VOTING_CLOSED
            NEW_PROPOSAL_NOTICE
            NEW_OPINION_COMMENT
            NEW_OPINION_LIKE
        }
        type Notification {
            id: String!
            target: String!
            type: ENUM_NOTIFICATION_TYPE!
        }
        enum ENUM_PROPOSAL_TYPE {
            SYSTEM
            BUSINESS
        }          
        enum ENUM_PROPOSAL_STATUS {
            PENDING_ASSESS
            ASSESS
            PENDING_VOTE
            VOTE
            REJECT
            CANCEL
            DELETED
            CLOSED
        }
        type SubProposal {
            id: ID!
            name: String!
            type: ENUM_PROPOSAL_TYPE!
            status: ENUM_PROPOSAL_STATUS!
            proposalId: String
            creator: ID
        }
        enum ENUM_POST_TYPE {
            SURVEY_RESPONSE
            POLL_RESPONSE
            BOARD_ARTICLE
            COMMENT_ON_ACTIVITY
            COMMENT_ON_POST
            REPLY_ON_COMMENT
        }          
        type SubPost {
            id: ID!
            type: ENUM_POST_TYPE!
            activity: ID!
            parentPost: ID
            writer: ID!
        }
    `,
    query: `
        ping: String
    `,
    subscription: `
        listenFeed(target: String!): Notification
        proposalCreated(memberId: ID!): SubProposal
        proposalChanged(proposalId: String!): SubProposal
        postCreated(activityId: ID!, memberId: ID!): SubPost
    `,
    resolver: {
        Query: {
            ping: () => 'pong',
        },
        Subscription: {
            listenFeed: {
                subscribe: withFilter(
                    () => {
                        return strapi.services.pubsub.asyncIterator('listenFeed');
                    },
                    (payload, variables) => {
                        return payload.listenFeed.target === variables.target;
                    },
                ),
            },
            proposalCreated: {
                subscribe: withFilter(
                    () => {
                        return strapi.services.pubsub.asyncIterator('proposalCreated');
                    },
                    (payload, variables) => {
                        return payload.proposalCreated.creator.toString() !== variables.memberId;
                    },
                ),
            },
            proposalChanged: {
                subscribe: withFilter(
                    () => {
                        return strapi.services.pubsub.asyncIterator('proposalChanged');
                    },
                    (payload, variables) => {
                        return payload.proposalChanged.proposalId === variables.proposalId;
                    },
                ),
            },
            postCreated: {
                subscribe: withFilter(
                    () => {
                        return strapi.services.pubsub.asyncIterator('postCreated');
                    },
                    (payload, variables) => {
                        return (
                            payload.postCreated.activity.toString() === variables.activityId &&
                            payload.postCreated.writer.toString() !== variables.memberId
                        );
                    },
                ),
            },
        },
    },
};
