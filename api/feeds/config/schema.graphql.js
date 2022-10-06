'use strict';

module.exports = {
    definition: `
        type ListFeedsPayload {
            notReadCount: Int,
            count: Int,
            values: [Feeds]
        }
    `,
    query: `
        listFeeds(where: JSON, sort: String, limit: Int, start: Int): ListFeedsPayload
    `,
    resolver: {
        Query: {
            listFeeds: {
                description: 'Query Feeds',
                resolver: 'application::feeds.feeds.listFeeds',
            },
        },
    },
};
