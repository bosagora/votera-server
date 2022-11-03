'use strict';

const {
    connectionIsMongoose,
    increaseInteractionReadCountMongoose,
    increaseInteractionReadCountBookshelf,
} = require('../../../src/util/strapi_helper');
const { convertQueryOperationError } = require('../../../src/util/serviceError');
const { ENUM_POST_STATUS_DELETED, ENUM_POST_STATUS_OPEN } = require('../../../src/types/post');
const {
    ENUM_INTERACTION_TYPE_LIKE_POST,
    ENUM_INTERACTION_TYPE_REPORT_POST,
    ENUM_INTERACTION_TYPE_READ_POST,
} = require('../../../src/types/interaction');

let increaseInteractionReadCount;

function chooseModelFunction() {
    if (connectionIsMongoose()) {
        increaseInteractionReadCount = increaseInteractionReadCountMongoose;
    } else {
        increaseInteractionReadCount = increaseInteractionReadCountBookshelf;
    }
}

async function getUserCount(proposalId) {
    const proposal = await strapi.query('proposal').findOne({ id: proposalId });
    return proposal ? proposal.memberCount : 0;
}

async function processReportOnPost(postId, proposalId) {
    try {
        let post = await strapi.query('post').findOne({ id: postId });
        if (!post) {
            return null;
        } else if (post.status === ENUM_POST_STATUS_DELETED) {
            return post;
        }

        if (post.reportCount < strapi.config.votera.report.reportMinCount) {
            return post;
        }

        const userCount = await getUserCount(proposalId);
        if (userCount === 0) {
            // 사용자 수 체크에 오류가 있을 가능성이 있음
            return post;
        }

        if (post.reportCount < Math.floor((strapi.config.votera.report.reportPercent * userCount) / 100)) {
            return post;
        }

        post = await strapi.query('post').update({ id: post.id }, { status: ENUM_POST_STATUS_DELETED });

        try {
            await strapi.query('interaction').update(
                { type: ENUM_INTERACTION_TYPE_REPORT_POST, post: postId },
                {
                    action: [
                        {
                            __component: 'interaction.report',
                            status: 'RESOLVED',
                        },
                    ],
                },
            );
        } catch (e1) {
            strapi.log.warn(`post.processReportOnPost update interaction failed: post.id = ${postId}\n%j`, e1);
        }

        return post;
    } catch (err) {
        strapi.log.warn(`post.processReportOnPost failed: post.id = ${postId}\n%j`, err);
        throw convertQueryOperationError(err);
    }
}

async function processRestoreOnPost(postId, proposalId) {
    try {
        let post = await strapi.query('post').findOne({ id: postId });
        if (!post) {
            return null;
        } else if (post.status === ENUM_POST_STATUS_OPEN) {
            return post;
        }

        const userCount = await getUserCount(proposalId);
        if (userCount === 0) {
            // 사용자 수 체크에 오류
            return post;
        }

        const userReportCount = Math.floor((strapi.config.votera.report.reportPercent * userCount) / 100);
        if (post.reportCount >= strapi.config.votera.report.reportMinCount && post.reportCount >= userReportCount) {
            return post;
        }

        post = await strapi.query('post').update({ id: post.id }, { status: ENUM_POST_STATUS_OPEN });

        try {
            await strapi.query('interaction').update(
                { type: ENUM_INTERACTION_TYPE_REPORT_POST, post: postId },
                {
                    action: [
                        {
                            __component: 'interaction.report',
                            status: 'UNRESOLVED',
                        },
                    ],
                },
            );
        } catch (e1) {
            strapi.log.warn(`post.processRestoreOnPost update interfaction failed: post.id = ${postId}\n%j`, e1);
        }
        return post;
    } catch (err) {
        strapi.log.warn(`post.processRestoreOnPost failed: post.id = ${postId}\n%j`, err);
        throw convertQueryOperationError(err);
    }
}

function getAction(interaction) {
    if (interaction?.action && interaction.action.length > 0) {
        return interaction.action[0];
    }
    return null;
}

module.exports = {
    async readArticle(post, actor, user) {
        if (!increaseInteractionReadCount) {
            chooseModelFunction();
        }

        let interaction = await strapi
            .query('interaction')
            .findOne({ post, actor, type: ENUM_INTERACTION_TYPE_READ_POST });
        if (interaction) {
            await increaseInteractionReadCount(interaction);
        } else {
            interaction = await strapi.query('interaction').create({
                type: ENUM_INTERACTION_TYPE_READ_POST,
                post,
                actor,
                action: [
                    {
                        __component: 'interaction.read',
                        count: 1,
                    },
                ],
                user,
            });
        }

        return {
            post: await strapi.query('post').findOne({ id: post }),
            interaction: await strapi.query('interaction').findOne({ id: interaction.id }),
        };
    },
    async postStatus(id, user) {
        let isLike = false;
        let isReported = false;
        let isRead = false;
        if (!user) {
            return { id, isLike, isReported, isRead };
        }
        const founds = await strapi.query('interaction').find({
            type_in: [
                ENUM_INTERACTION_TYPE_LIKE_POST,
                ENUM_INTERACTION_TYPE_REPORT_POST,
                ENUM_INTERACTION_TYPE_READ_POST,
            ],
            post: id,
            actor: user.member.id,
        });
        for (let i = 0; i < founds?.length; i += 1) {
            const found = founds[i];
            switch (found.type) {
                case ENUM_INTERACTION_TYPE_LIKE_POST:
                    isLike = true;
                    break;
                case ENUM_INTERACTION_TYPE_REPORT_POST:
                    isReported = true;
                    break;
                case ENUM_INTERACTION_TYPE_READ_POST:
                    isRead = true;
                    break;
            }
        }
        return { id, isLike, isReported, isRead };
    },
    async activityPosts(id, type, _start, _limit, _sort, user) {
        const countParam = { activity: id };
        const findParam = { activity: id, _start: _start ?? 0 };
        if (type) {
            countParam.type = type;
            findParam.type = type;
        }
        if (_limit) {
            findParam._limit = _limit;
        }
        if (_sort) {
            findParam._sort = _sort;
        }
        const count = await strapi.query('post').count(countParam);
        const values = await strapi.query('post').find(findParam);
        const statuses = await Promise.all(values.map((value) => this.postStatus(value.id, user)));
        return { count, values, statuses };
    },
    async postComments(id, _start, _limit, _sort, user) {
        const findParam = { parentPost: id, _start: _start ?? 0 };
        if (_limit) {
            findParam._limit = _limit;
        }
        if (_sort) {
            findParam._sort = _sort;
        } else {
            findParam._sort = 'createdAt:asc';
        }
        const count = await strapi.query('post').count({ parentPost: id });
        const values = await strapi.query('post').find(findParam);
        const statuses = await Promise.all(values.map((value) => this.postStatus(value.id, user)));
        return { count, values, statuses };
    },
    async createReportPost(postId, activityId, proposalId, memberId, user) {
        try {
            // check duplication
            let interaction = await strapi.query('interaction').findOne({
                type: ENUM_INTERACTION_TYPE_REPORT_POST,
                activity: activityId,
                post: postId,
                proposal: proposalId,
                user: user.id,
            });
            if (!interaction) {
                interaction = await strapi.query('interaction').create({
                    type: ENUM_INTERACTION_TYPE_REPORT_POST,
                    activity: activityId,
                    post: postId,
                    actor: memberId,
                    proposal: proposalId,
                    user: user.id,
                    action: [
                        {
                            __component: 'interaction.report',
                            status: 'UNRESOLVED',
                        },
                    ],
                });
            }
            const post = await processReportOnPost(postId, proposalId);
            const status = await this.postStatus(postId, user);
            return { interaction, post, status };
        } catch (err) {
            strapi.log.warn(`post.createReportPost failed: postId = ${postId} memberId = ${memberId}\n%j`, err);
            throw convertQueryOperationError(err);
        }
    },
    async deleteReportPost(postId, activityId, proposalId, memberId, user) {
        try {
            // check existence
            let interaction = await strapi.query('interaction').findOne({
                type: ENUM_INTERACTION_TYPE_REPORT_POST,
                activity: activityId,
                post: postId,
                proposal: proposalId,
                user: user.id,
            });
            if (interaction) {
                interaction = await strapi.query('interaction').delete({ id: interaction.id });
            }
            return {
                interaction,
                post: await processRestoreOnPost(postId, proposalId),
                status: await this.postStatus(postId, user),
            };
        } catch (err) {
            strapi.log.warn(`post.deleteReportPost failed: postId = ${postId} memberId = ${memberId}\n%j`, err);
            throw convertQueryOperationError(err);
        }
    },
    async togglePostLike(isLike, postId, memberId, user) {
        try {
            const foundInteraction = await strapi.services.interaction.findOne({
                type: ENUM_INTERACTION_TYPE_LIKE_POST,
                post: postId,
                actor: memberId,
            });
            if (isLike) {
                if (foundInteraction) {
                    const action = getAction(foundInteraction);
                    if (!action || action.__component !== 'interaction.like' || action.type !== 'LIKE') {
                        await strapi.services.interaction.update(
                            { id: foundInteraction.id },
                            {
                                action: [
                                    {
                                        __component: 'interaction.like',
                                        type: 'LIKE',
                                    },
                                ],
                            },
                        );
                    }
                } else {
                    await strapi.services.interaction.create({
                        type: ENUM_INTERACTION_TYPE_LIKE_POST,
                        action: [
                            {
                                __component: 'interaction.like',
                                type: 'LIKE',
                            },
                        ],
                        post: postId,
                        proposal: null,
                        actor: memberId,
                        user: user.id,
                    });
                }
            } else {
                if (foundInteraction) {
                    await strapi.services.interaction.delete({ id: foundInteraction.id });
                }
            }
            const post = await strapi.query('post').findOne({ id: postId });
            const status = await this.postStatus(postId, user);
            return { isLike, post, status };
        } catch (e) {
            strapi.log.warn(`togglePostLike failed: post.id = ${postId} member.id = ${memberId}\n%j`, e);
            throw convertQueryOperationError(e);
        }
    },
};
