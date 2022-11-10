'use strict';

module.exports = {
    definition: `
        type PostStatus {
            id: ID!
            isLike: Boolean
            isReported: Boolean
            isRead: Boolean
        }
        type ReadArticlePayload {
            post: Post
            status: PostStatus
        }
        type ActivityPostsPayload {
            count: Int
            values: [Post]
            statuses: [PostStatus]
        }
        type PostCommentsPayload {
            count: Int
            values: [Post]
            statuses: [PostStatus]
        }
        input ReportPostInputData {
            postId: ID!
            activityId: ID!
            actor: ID! 
        }
        input ReportPostInput {
            data: ReportPostInputData
        }
        type ReportPostPayload {
            interaction: Interaction
            post: Post
            status: PostStatus
        }
        input TogglePostLikeInputData {
            isLike: Boolean!
            postId: String!
            memberId: String!
        }
        input TogglePostLikeInput {
            data: TogglePostLikeInputData
        }
        type TogglePostLikePayload {
            isLike: Boolean
            post: Post
            status: PostStatus
        }
    `,
    query: `
        postStatus(id: ID!): PostStatus
        activityPosts(id: ID!, type: String!, sort: String, limit: Int, start: Int): ActivityPostsPayload
        postComments(id: ID!, sort: String, limit: Int, start: Int): PostCommentsPayload
    `,
    mutation: `
        readArticle(id: ID!): ReadArticlePayload
        reportPost(input: ReportPostInput): ReportPostPayload
        restorePost(input: ReportPostInput): ReportPostPayload
        togglePostLike(input: TogglePostLikeInput): TogglePostLikePayload
    `,
    resolver: {
        Query: {
            postStatus: {
                description: 'Query post-member status',
                resolver: 'application::post.post.postStatus',
            },
            activityPosts: {
                description: 'Query Posts of Activity',
                resolver: 'application::post.post.activityPosts',
            },
            postComments: {
                description: 'Query Child Posts of Post',
                resolver: 'application::post.post.postComments',
            },
        },
        Mutation: {
            readArticle: {
                description: 'Count read Article or Comment',
                resolver: 'application::post.post.readArticle',
            },
            reportPost: {
                description: 'Post 신고',
                resolver: 'application::post.post.reportPost',
            },
            restorePost: {
                description: 'Post 신고 철회',
                resolver: 'application::post.post.restorePost',
            },
            togglePostLike: {
                description: '좋아요 버튼을 상황에 따라서 토글시킨다.',
                resolver: 'application::post.post.togglePostLike',
            },
        },
    },
};
