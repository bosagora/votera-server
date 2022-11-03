'use strict';

const {
    ENUM_POST_TYPE_BOARD_ARTICLE,
    ENUM_POST_TYPE_COMMENT_ON_ACTIVITY,
    ENUM_POST_TYPE_COMMENT_ON_POST,
    ENUM_POST_TYPE_REPLY_ON_COMMENT,
    ENUM_POST_TYPE_SURVEY_RESPONSE,
    ENUM_POST_TYPE_POLL_RESPONSE,
    ENUM_POST_STATUS_OPEN,
    ENUM_POST_STATUS_DELETED,
} = require('../../../src/types/post');
const {
    connectionIsMongoose,
    increaseActivityCommentCountMongoose,
    increaseActivityCommentCountBookshelf,
    increasePostCommentCountMongoose,
    increasePostCommentCountBookshelf,
    increaseActivityParticipantCountMongoose,
    increaseActivityParticipantCountBookshelf,
    existOtherParticipatedPost,
} = require('../../../src/util/strapi_helper');

let increaseActivityCommentCount;
let increasePostCommentCount;
let increaseActivityParticipantCount;

function chooseModelFunction() {
    if (connectionIsMongoose()) {
        increaseActivityCommentCount = increaseActivityCommentCountMongoose;
        increasePostCommentCount = increasePostCommentCountMongoose;
        increaseActivityParticipantCount = increaseActivityParticipantCountMongoose;
    } else {
        increaseActivityCommentCount = increaseActivityCommentCountBookshelf;
        increasePostCommentCount = increasePostCommentCountBookshelf;
        increaseActivityParticipantCount = increaseActivityParticipantCountBookshelf;
    }
}

const usePublishTypes = [
    ENUM_POST_TYPE_BOARD_ARTICLE, // 공지
    ENUM_POST_TYPE_COMMENT_ON_ACTIVITY,
    ENUM_POST_TYPE_COMMENT_ON_POST, // 공지,의견에 답변
    ENUM_POST_TYPE_REPLY_ON_COMMENT, // 답변의 답변 (사용하지 않음)
];

const useNotifyTypes = [
    ENUM_POST_TYPE_BOARD_ARTICLE, // 공지
    ENUM_POST_TYPE_COMMENT_ON_POST, // 공지,의견에 답변
    ENUM_POST_TYPE_REPLY_ON_COMMENT, // 답변의 답변 (사용하지 않음)
];

async function postCreated(post) {
    if (post.status !== ENUM_POST_STATUS_OPEN) {
        return;
    }

    if (post.type === ENUM_POST_TYPE_COMMENT_ON_ACTIVITY) {
        await increaseActivityCommentCount(post.activity?.id, 1);
        post.activity = await strapi.query('activity').findOne({ id: post.activity.id }, []);
    } else if (post.type === ENUM_POST_TYPE_COMMENT_ON_POST) {
        await increasePostCommentCount(post.parentPost?.id, 1);
        post.parentPost = await strapi.query('post').findOne({ id: post.parentPost?.id }, []);
    } else if (post.type === ENUM_POST_TYPE_REPLY_ON_COMMENT) {
        await increasePostCommentCount(post.parentPost?.id, 1);
        post.parentPost = await strapi.query('post').findOne({ id: post.parentPost?.id }, []);
    } else {
        let existOther;
        switch (post.type) {
            case ENUM_POST_TYPE_SURVEY_RESPONSE:
            case ENUM_POST_TYPE_POLL_RESPONSE:
                existOther = await existOtherParticipatedPost(post);
                if (!existOther) {
                    await increaseActivityParticipantCount(post.activity?.id, 1);
                }
                break;
            default:
                break;
        }
    }
}

async function postUpdated(post, data) {
    let count;
    switch (post.status) {
        case ENUM_POST_STATUS_OPEN:
            if (data.status !== ENUM_POST_STATUS_DELETED) {
                return;
            }
            count = -1;
            break;
        case ENUM_POST_STATUS_DELETED:
            if (data.status !== ENUM_POST_STATUS_OPEN) {
                return;
            }
            count = 1;
            break;
        default:
            return;
    }

    if (post.type === ENUM_POST_TYPE_COMMENT_ON_ACTIVITY) {
        await increaseActivityCommentCount(post.activity?.id, count);
    } else if (post.type === ENUM_POST_TYPE_COMMENT_ON_POST) {
        await increasePostCommentCount(post.parentPost?.id, count);
    } else if (post.type === ENUM_POST_TYPE_REPLY_ON_COMMENT) {
        await increasePostCommentCount(post.parentPost?.id, count);
    } else {
        let existOther;
        switch (post.type) {
            case ENUM_POST_TYPE_SURVEY_RESPONSE:
            case ENUM_POST_TYPE_POLL_RESPONSE:
                existOther = await existOtherParticipatedPost(post);
                if (!existOther) {
                    await increaseActivityParticipantCount(post.activity.id, count);
                }
                break;
            default:
                break;
        }
    }
}

async function postDeleted(post) {
    if (post.status !== ENUM_POST_STATUS_OPEN) {
        return;
    }

    if (post.type === ENUM_POST_TYPE_COMMENT_ON_ACTIVITY) {
        await increaseActivityCommentCount(post.activity?.id, -1);
    } else if (post.type === ENUM_POST_TYPE_COMMENT_ON_POST) {
        await increasePostCommentCount(post.parentPost?.id, -1);
    } else if (post.type === ENUM_POST_TYPE_REPLY_ON_COMMENT) {
        await increasePostCommentCount(post.parentPost?.id, -1);
    } else {
        let existOther;
        switch (post.type) {
            case ENUM_POST_TYPE_SURVEY_RESPONSE:
            case ENUM_POST_TYPE_POLL_RESPONSE:
                existOther = await existOtherParticipatedPost(post);
                if (!existOther) {
                    await increaseActivityParticipantCount(post.activity?.id, -1);
                }
                break;
            default:
                break;
        }
    }
}

module.exports = {
    lifecycles: {
        async beforeCreate(data) {
            if (data.likeCount === undefined || data.likeCount === null) {
                data.likeCount = 0;
            }
            if (data.readCount === undefined || data.readCount === null) {
                data.readCount = 0;
            }
            if (data.commentCount === undefined || data.commentCount === null) {
                data.commentCount = 0;
            }
            if (data.reportCount === undefined || data.reportCount === null) {
                data.reportCount = 0;
            }
        },
        async afterCreate(result) {
            if (!increaseActivityCommentCount) {
                chooseModelFunction();
            }
            try {
                await postCreated(result);

                if (usePublishTypes.includes(result.type)) {
                    const subPost = {
                        id: result.id,
                        type: result.type,
                        activity: result.activity?.id,
                        parentPost: result.parentPost?.id,
                        writer: result.writer?.id,
                    };
                    strapi.services.pubsub.publish('postCreated', { postCreated: subPost }).catch((err) => {
                        strapi.log.warn(`publish.postCreated failed: post.id = ${result.id}\n%j`, err);
                    });
                }

                if (useNotifyTypes.includes(result.type)) {
                    strapi.services.notification.onPostCreated(result);
                }
            } catch (error) {
                strapi.log.warn(`publish.postCreated failed: post.id = ${result.id}\n%j`, error);
            }
        },
        async beforeUpdate(where, data) {
            if (!increaseActivityCommentCount) {
                chooseModelFunction();
            }
            try {
                if (data.status) {
                    const founds = await strapi.query('post').find(where);
                    if (founds?.length) {
                        for (let i = 0; i < founds.length; i += 1) {
                            await postUpdated(founds[i], data);
                        }
                    }
                }
            } catch (err) {
                strapi.log.warn('post.beforeUpdate catch: ', err);
            }
        },
        async afterDelete(result, params) {
            if (!increaseActivityCommentCount) {
                chooseModelFunction();
            }
            try {
                if (Array.isArray(result)) {
                    for (let i = 0; i < result.length; i += 1) {
                        await postDeleted(result[i]);
                    }
                } else {
                    await postDeleted(result);
                }
            } catch (err) {
                strapi.log.warn('post.afterDelete catch: ', err);
            }
        },
    },
};
