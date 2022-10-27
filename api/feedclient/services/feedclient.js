'use strict';

const {
    // connectionIsMongoose,
    // insertManyFeedsMongoose,
    // insertManyFeedsBookshelf,
    getValueId,
} = require('../../../src/util/strapi_helper');
const {
    ENUM_FEEDS_TYPE_NEW_PROPOSAL,
    // ENUM_FEEDS_TYPE_ASSESS_PENDING,
    ENUM_FEEDS_TYPE_ASSESS_24HR_DEADLINE,
    ENUM_FEEDS_TYPE_ASSESS_CLOSED,
    ENUM_FEEDS_TYPE_VOTING_START,
    // ENUM_FEEDS_TYPE_VOTING_PENDING,
    ENUM_FEEDS_TYPE_VOTING_24HR_DEADLINE,
    ENUM_FEEDS_TYPE_VOTING_CLOSED,
    ENUM_FEEDS_TYPE_NEW_PROPOSAL_NOTICE,
    ENUM_FEEDS_TYPE_NEW_OPINION_COMMENT,
    ENUM_FEEDS_TYPE_NEW_OPINION_LIKE,
} = require('../../../src/types/feeds');
const {
    ENUM_PROPOSAL_STATUS_PENDING_VOTE,
    ENUM_PROPOSAL_STATUS_VOTE,
    ENUM_PROPOSAL_STATUS_CLOSED,
    // ENUM_PROPOSAL_STATUS_PENDING_ASSESS,
    ENUM_PROPOSAL_STATUS_ASSESS,
    ENUM_PROPOSAL_TYPE_BUSINESS,
} = require('../../../src/types/proposal');
const {
    ENUM_POST_TYPE_BOARD_ARTICLE,
    ENUM_POST_TYPE_COMMENT_ON_POST,
    ENUM_POST_TYPE_REPLY_ON_COMMENT,
} = require('../../../src/types/post');
const { ENUM_INTERACTION_TYPE_LIKE_POST } = require('../../../src/types/interaction');
const {
    ENUM_FOLLOW_TYPE_PROPOSAL_CREATE,
    ENUM_FOLLOW_TYPE_PROPOSAL_JOIN,
    ENUM_FOLLOW_TYPE_POST,
} = require('../../../src/types/follow');

const MAX_USER_FEED_LIMIT = 100;

// let insertManyFeeds;

// function chooseModelFunction() {
//     if (connectionIsMongoose()) {
//         insertManyFeeds = insertManyFeedsMongoose;
//     } else {
//         insertManyFeeds = insertManyFeedsBookshelf;
//     }
// }

async function selectNewProposalsNews(creatorUserId, maxUserFeed) {
    let userFeeds;
    if (maxUserFeed) {
        userFeeds = await strapi.query('user-feed').find({
            newProposalsNews: true,
            user_ne: creatorUserId,
            id_gt: maxUserFeed,
            _sort: 'id',
            _limit: MAX_USER_FEED_LIMIT,
        });
    } else {
        userFeeds = await strapi.query('user-feed').find({
            newProposalsNews: true,
            user_ne: creatorUserId,
            _sort: 'id',
            _limit: MAX_USER_FEED_LIMIT,
        });
    }
    if (!userFeeds || userFeeds.length === 0) {
        return null;
    }

    const lastUserFeed = userFeeds[userFeeds.length - 1].id;
    if (!lastUserFeed) {
        return null;
    }

    return { lastUserFeed, userFeeds };
}

async function selectLikeProposalsNews(proposalId, maxFollow) {
    let follows;
    if (maxFollow) {
        follows = await strapi.query('follow').find(
            {
                target: proposalId,
                isFeedActive: true,
                type: ENUM_FOLLOW_TYPE_PROPOSAL_JOIN,
                id_gt: maxFollow,
                _sort: 'id',
                _limit: MAX_USER_FEED_LIMIT,
            },
            ['user_feed'],
        );
    } else {
        follows = await strapi.query('follow').find(
            {
                target: proposalId,
                isFeedActive: true,
                type: ENUM_FOLLOW_TYPE_PROPOSAL_JOIN,
                _sort: 'id',
                _limit: MAX_USER_FEED_LIMIT,
            },
            ['user_feed'],
        );
    }
    if (!follows || follows.length === 0) {
        return null;
    }

    const lastFollow = follows[follows.length - 1].id;
    if (!lastFollow) {
        return null;
    }

    const userFeeds = follows.map((follow) => follow.user_feed).filter((user_feed) => user_feed.likeProposalsNews);
    if (!userFeeds || userFeeds.length === 0) {
        return { lastFollow, userFeeds: null };
    }

    return { lastFollow, userFeeds };
}

async function selectMyProposalsNews(proposalId) {
    const follows = await strapi.query('follow').find(
        {
            target: proposalId,
            isFeedActive: true,
            type: ENUM_FOLLOW_TYPE_PROPOSAL_CREATE,
        },
        ['user_feed'],
    );
    if (!follows || follows.length === 0) {
        return null;
    }

    const userFeeds = follows.map((follow) => follow.user_feed).filter((user_feed) => user_feed.myProposalsNews);
    if (!userFeeds || userFeeds.length === 0) {
        return null;
    }

    return userFeeds;
}

async function selectMyCommentsNews(postId) {
    const follows = await strapi.query('follow').find(
        {
            target: postId,
            isFeedActive: true,
            type: ENUM_FOLLOW_TYPE_POST,
        },
        ['user_feed'],
    );
    if (!follows || follows.length === 0) {
        return null;
    }

    const userFeeds = follows.map((follow) => follow.user_feed).filter((user_feed) => user_feed.myCommentsNews);
    if (!userFeeds || userFeeds.length === 0) {
        return null;
    }

    return userFeeds;
}

function makeFeedsProposal(proposal, type) {
    return {
        type,
        content: { proposalTitle: proposal.name },
        navigation: { proposalId: proposal.proposalId },
        isRead: false,
    };
}

/*
function makePayloadProposal(proposal, type) {
    let en_title, en_body, ko_title, ko_body;

    switch (type) {
        case ENUM_FEEDS_TYPE_NEW_PROPOSAL:
            ko_title = '새로운 제안이 만들어졌어요!';
            ko_body = `${proposal.name} 이 등록되었으니 확인해 보세요.`;
            en_title = 'New proposal';
            en_body = `${proposal.name} has enrolled. Please check it out!`;
            break;
        // case ENUM_FEEDS_TYPE_ASSESS_PENDING:
        //     ko_title = '제안수수료 입금 안내';
        //     ko_body = `${proposal.name} 의 사전 평가를 시작하시려면 제안수수료를 24시간 내에 입금해 주시기 바랍니다.`;
        //     en_title = 'Proposal fee deposit required';
        //     en_body = `Please deposit proposal fee of ${proposal.name}. 24 hours left to begin assessment of proposal feasibility`;
        //     break;
        case ENUM_FEEDS_TYPE_ASSESS_24HR_DEADLINE:
            ko_title = '사전 평가 종료 전 24시간';
            ko_body = `${proposal.name} 의 사전 평가 종료까지 24시간 남았습니다! 종료전 참여해보세요.`;
            en_title = '24 hours left to assess proposal feasibility';
            en_body = `24 hours left to access ${proposal.name}'s feasibility assessment! Please join in before it ends.`;
            break;
        case ENUM_FEEDS_TYPE_ASSESS_CLOSED:
            ko_title = '사전평가 종료';
            ko_body = `${proposal.name} 사전평가가 종료되었습니다. 평가 결과를 확인해보세요.`;
            en_title = 'feasibility assessment closed';
            en_body = `${proposal.name}'s feasibility assessment has closed. Please check out the results.`;
            break;
        case ENUM_FEEDS_TYPE_VOTING_START:
            ko_title = '투표 시작';
            ko_body = `${proposal.name} 의 투표가 시작되었으니 투표에 참여해보세요.`;
            en_title = 'vote opening';
            en_body = `${proposal.name}'s voting is jsut started! Please join in :)`;
            break;
        // case ENUM_FEEDS_TYPE_VOTING_PENDING:
        //     ko_title = '투표비 입금 안내';
        //     ko_body = `${proposal.name} 의 투표를 시작하시면 투표비를 24시간 내에 입금해 주시기 바랍니다.`;
        //     en_title = 'Vote fee deposit required';
        //     en_body = `Please deposit vote fee of ${proposal.name}. 24 hours left to begin vote`;
        //     break;
        case ENUM_FEEDS_TYPE_VOTING_24HR_DEADLINE:
            ko_title = '투표 종료 전 24시간';
            ko_body = `${proposal.name} 의 투표 종료까지 24시간 남았습니다. 놓치치 말고 투표하세요.`;
            en_title = '24 hours left to vote';
            en_body = `24 hours left to access ${proposal.name}'s voting! Please don't miss out on your vote.`;
            break;
        case ENUM_FEEDS_TYPE_VOTING_CLOSED:
            ko_title = '투표 종료';
            ko_body = `${proposal.name} 투표가 종료되었습니다. 결과를 확인해보세요.`;
            en_title = 'Vote closed';
            en_body = `${proposal.name}'s voting has ended. Please check out the results.`;
            break;
        case ENUM_FEEDS_TYPE_NEW_PROPOSAL_NOTICE:
            ko_title = '제안 공지 등록';
            ko_body = `${proposal.name} 에 새로운 공지가 등록되었습니다. 확인해보세요.`;
            en_title = 'New proposal notice';
            en_body = `${proposal.name}' new notice has posted. Please check it out!`;
            break;
        default:
            return null;
    }
    return {
        payload_en: {
            title: en_title,
            body: en_body,
        },
        payload_ko: {
            title: ko_title,
            body: ko_body,
        },
    };
}
*/

function makeFeedsComment(postId, activityId, proposalId, memberName, type) {
    return {
        type,
        content: { userName: memberName },
        navigation: { postId, activityId, proposalId },
        isRead: false,
    };
}

/*
function makePayloadComment(activity, memberName, type) {
    let en_title, en_body, ko_title, ko_body;
    switch (type) {
        case ENUM_FEEDS_TYPE_NEW_OPINION_COMMENT:
            ko_title = '의견에 답글 달림';
            ko_body = `${memberName} 님이 당신의 의견에 댓글을 남겼습니다.`;
            en_title = 'New comment';
            en_body = `${memberName} commented on your opinion.`;
            break;
        case ENUM_FEEDS_TYPE_NEW_OPINION_LIKE:
            ko_title = '좋아요 받음';
            ko_body = `${memberName} 님이 당신의 의견을 추천했습니다.`;
            en_title = 'New like';
            en_body = `${memberName} recommended your opinion.`;
            break;
        default:
            return null;
    }

    return {
        payload_en: {
            title: en_title,
            body: en_body,
        },
        payload_ko: {
            title: ko_title,
            body: ko_body,
        },
    };
}
*/

async function saveFeeds(userFeeds, feed) {
    const targets = userFeeds.map((userFeed) => {
        return { ...feed, target: getValueId(userFeed.user) };
    });
    Promise.all(targets.map((target) => strapi.query('feeds').create(target))).catch((err) => {
        strapi.log.warn('saveFeeds failed');
        strapi.log.warn(err);
    });
    // if (!insertManyFeeds) {
    //     chooseModelFunction();
    // }
    // await insertManyFeeds(targets);
}

/*
function sendNotification(userFeeds, payload_ko, payload_en) {
    const pushes_en = userFeeds
        .filter((userFeed) => !userFeed.locale || userFeed.locale.indexOf('ko') === -1)
        .map((userFeed) => userFeed.pushes.filter((push) => push.isActive))
        .flat();
    if (pushes_en && pushes_en.length > 0) {
        const message_en = { ...payload_en, tokens: pushes_en.map((push) => push.token) };
        fcm.sendToDevices(message_en).catch((err) => {
            strapi.log.warn(`fcm.sendToDevices exception`, { message: message_en });
            strapi.log.warn(err);
        });
    }

    const pushes_ko = userFeeds
        .filter((userFeed) => userFeed.locale && userFeed.locale.indexOf('ko') !== -1)
        .map((userFeed) => userFeed.pushes.filter((push) => push.isActive))
        .flat();
    if (pushes_ko && pushes_ko.length > 0) {
        const message_ko = { ...payload_ko, tokens: pushes_ko.map((push) => push.token) };
        fcm.sendToDevices(message_ko).catch((err) => {
            strapi.log.warn(`fcm.sendToDevices exception`, { message: message_ko });
            strapi.log.warn(err);
        });
    }
}
*/

async function processNewProposal(proposal, type) {
    const feed = makeFeedsProposal(proposal, type);
    if (!feed) {
        return;
    }
    // const payloads = makePayloadProposal(proposal, type);
    // if (!payloads) {
    //     return;
    // }

    const creatorUserId = getValueId(proposal.creator.user);

    let userList = await selectNewProposalsNews(creatorUserId);
    while (userList) {
        if (userList.userFeeds) {
            await saveFeeds(userList.userFeeds, feed);
            // sendNotification(userList.userFeeds, payloads.payload_ko, payloads.payload_en);
        }

        userList = await selectNewProposalsNews(creatorUserId, userList.lastUserFeed);
    }
}

async function processProposal(proposal, type, myProcess, likeProcess) {
    const feed = makeFeedsProposal(proposal, type);
    if (!feed) {
        return;
    }
    // const payloads = makePayloadProposal(proposal, type);
    // if (!payloads) {
    //     return;
    // }

    if (myProcess) {
        const userFeeds = await selectMyProposalsNews(proposal.id);
        if (userFeeds) {
            await saveFeeds(userFeeds, feed);
            // sendNotification(userFeeds, payloads.payload_ko, payloads.payload_en);
        }
    }
    if (likeProcess) {
        let userList = await selectLikeProposalsNews(proposal.id);
        while (userList) {
            if (userList.userFeeds) {
                await saveFeeds(userList.userFeeds, feed);
                // sendNotification(userList.userFeeds, payloads.payload_ko, payloads.payload_en);
            }

            userList = await selectLikeProposalsNews(proposal.id, userList.lastFollow);
        }
    }
}

async function processComment(postId, activityId, proposalId, memberName, type) {
    const feed = makeFeedsComment(postId, activityId, proposalId, memberName, type);
    if (!feed) {
        return;
    }
    // const payloads = makePayloadComment(activity, memberName, type);
    // if (!payloads) {
    //     return;
    // }

    const userFeeds = await selectMyCommentsNews(postId);
    if (!userFeeds) {
        return;
    }

    await saveFeeds(userFeeds, feed);
    // sendNotification(userFeeds, payloads.payload_ko, payloads.payload_en);
}

module.exports = {
    async onProposalCreated(proposal) {
        strapi.log.debug(`feedclient.onProposalCreated proposal.id = ${proposal.id}`);
        const type = ENUM_FEEDS_TYPE_NEW_PROPOSAL;
        await processNewProposal(proposal, type);
    },
    async onProposalUpdated(proposal) {
        strapi.log.debug(`feedclient.onProposalUpdated proposal.id = ${proposal.id}`);
        let type;
        // myProposalsNews: true
        // likeProposalsNews: true
        switch (proposal.status) {
            case ENUM_PROPOSAL_STATUS_PENDING_VOTE: // 사전평가 종료
                if (proposal.type !== ENUM_PROPOSAL_TYPE_BUSINESS) {
                    return;
                }
                type = ENUM_FEEDS_TYPE_ASSESS_CLOSED;
                break;
            case ENUM_PROPOSAL_STATUS_VOTE:
                type = ENUM_FEEDS_TYPE_VOTING_START;
                break;
            case ENUM_PROPOSAL_STATUS_CLOSED:
                type = ENUM_FEEDS_TYPE_VOTING_CLOSED;
                break;
            default:
                return;
        }

        await processProposal(proposal, type, true, true);
    },
    async onProposalTimeAlarm(proposal) {
        strapi.log.debug(`feedclient.onProposalTimeAlarm proposal = ${proposal.id}`);
        let type;
        let likeProposalsNews = false;
        switch (proposal.status) {
            // case ENUM_PROPOSAL_STATUS_PENDING_ASSESS:
            //     type = ENUM_FEEDS_TYPE_ASSESS_PENDING;
            //     break;
            case ENUM_PROPOSAL_STATUS_ASSESS:
                type = ENUM_FEEDS_TYPE_ASSESS_24HR_DEADLINE;
                likeProposalsNews = true;
                break;
            // case ENUM_PROPOSAL_STATUS_PENDING_VOTE:
            //     type = ENUM_FEEDS_TYPE_VOTING_PENDING;
            //     break;
            case ENUM_PROPOSAL_STATUS_VOTE:
                type = ENUM_FEEDS_TYPE_VOTING_24HR_DEADLINE;
                likeProposalsNews = true;
                break;
            default:
                return;
        }

        await processProposal(proposal, type, true, likeProposalsNews);
    },
    async onPostCreated(post) {
        strapi.log.debug(`feedclient.onPostCreated post.id = ${post.id}`);

        let type;
        switch (post.type) {
            case ENUM_POST_TYPE_BOARD_ARTICLE:
                type = ENUM_FEEDS_TYPE_NEW_PROPOSAL_NOTICE;
                // likeProposalsNews: true
                break;
            case ENUM_POST_TYPE_COMMENT_ON_POST:
            case ENUM_POST_TYPE_REPLY_ON_COMMENT:
                type = ENUM_FEEDS_TYPE_NEW_OPINION_COMMENT;
                // myCommentsNews: true
                break;
            default:
                return;
        }

        const proposal = await strapi.query('proposal').findOne({ id: getValueId(post.activity.proposal) }, []);
        if (type === ENUM_FEEDS_TYPE_NEW_OPINION_COMMENT) {
            await processComment(
                getValueId(post.parentPost),
                getValueId(post.activity),
                proposal.proposalId,
                post.writer.username,
                type,
            );
        } else if (type === ENUM_FEEDS_TYPE_NEW_PROPOSAL_NOTICE) {
            await processProposal(proposal, type, false, true);
        }
    },
    async onInteractionCreated(interaction) {
        strapi.log.debug(`feedclient.onInteractionCreated interaction = ${interaction.id}`);
        let type;
        switch (interaction.type) {
            case ENUM_INTERACTION_TYPE_LIKE_POST:
                type = ENUM_FEEDS_TYPE_NEW_OPINION_LIKE;
                // myCommentsNews: true
                break;
            default:
                return;
        }

        const activityId = getValueId(interaction.post.activity);
        const activity = await strapi.query('activity').findOne({ id: activityId }, ['proposal']);
        if (activity?.proposal) {
            const proposalId = activity.proposal.proposalId;
            await processComment(
                getValueId(interaction.post),
                activityId,
                proposalId,
                interaction.actor.username,
                type,
            );
        }
    },
};
