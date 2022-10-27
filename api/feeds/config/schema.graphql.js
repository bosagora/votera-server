'use strict';

module.exports = {
    definition: `
        type ListFeedsPayload {
            notReadCount: Int
            count: Int
            values: [Feeds]
        }
        type FeedsStatus {
            notReadCount: Int
        }
    `,
    query: `
        listFeeds(where: JSON, sort: String, limit: Int, start: Int): ListFeedsPayload
        feedsStatus: FeedsStatus
    `,
    resolver: {
        Query: {
            listFeeds: {
                description: 'Query Feeds',
                resolver: 'application::feeds.feeds.listFeeds',
            },
            feedsStatus: {
                description: 'Query Feeds Status',
                resolver: 'application::feeds.feeds.feedsStatus',
            },
        },
    },
};
