'use strict';

const {
    connectionIsMongoose,
    increaseInteractionReadCountMongoose,
    increaseInteractionReadCountBookshelf,
    getValueId,
} = require('../../../src/util/strapi_helper');
const { convertQueryOperationError } = require('../../../src/util/serviceError');
const { ENUM_POST_STATUS_DELETED, ENUM_POST_STATUS_OPEN } = require('../../../src/types/post');
const {
    ENUM_INTERACTION_TYPE_LIKE_POST,
    ENUM_INTERACTION_TYPE_REPORT_POST,
    ENUM_INTERACTION_TYPE_READ_POST,
    ENUM_INTERACTION_ACTION_READ,
    ENUM_INTERACTION_ACTION_LIKE,
    ENUM_INTERACTION_ACTION_REPORT,
} = require('../../../src/types/interaction');
const { ENUM_MEMBERROLE_SCOPE_PROPOSAL, ENUM_MEMBERROLE_STATUS_NORMAL } = require('../../../src/types/member-role');

const FETCH_LIMIT = 100;

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
                            __component: ENUM_INTERACTION_ACTION_REPORT,
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
                            __component: ENUM_INTERACTION_ACTION_REPORT,
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
    async readArticle(postId, actor, user) {
        if (!increaseInteractionReadCount) {
            chooseModelFunction();
        }

        const post = await strapi.query('post').findOne({ id: postId });
        if (!post) {
            throw strapi.errors.notFound('notFound post');
        }

        const activity = getValueId(post.activity);

        let interaction = await strapi
            .query('interaction')
            .findOne({ post: post.id, actor, type: ENUM_INTERACTION_TYPE_READ_POST });
        if (interaction) {
            await increaseInteractionReadCount(interaction);
        } else {
            interaction = await strapi.query('interaction').create({
                type: ENUM_INTERACTION_TYPE_READ_POST,
                activity,
                post: post.id,
                actor,
                action: [
                    {
                        __component: ENUM_INTERACTION_ACTION_READ,
                        count: 1,
                    },
                ],
                user,
            });
        }

        return {
            post: await strapi.query('post').findOne({ id: postId }),
            status: { id: post.id, isRead: true },
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
                    if (found.action?.length > 0) {
                        const action = found.action[0];
                        if (action?.__component === ENUM_INTERACTION_ACTION_READ && action.count > 0) {
                            isRead = true;
                        }
                    }
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
    async createReportPost(postId, activityId, memberId, user) {
        try {
            let post = await strapi.query('post').findOne({ id: postId }, []);
            if (!post) {
                throw strapi.errors.notFound('notFound post');
            }
            const activity = await strapi.query('activity').findOne({ id: activityId }, []);
            if (!activity) {
                throw strapi.errors.notFound('notFound activity');
            }

            // check duplication
            let interaction = await strapi.query('interaction').findOne({
                type: ENUM_INTERACTION_TYPE_REPORT_POST,
                activity: activity.id,
                post: post.id,
                proposal: activity.proposal,
                user: user.id,
            });
            if (!interaction) {
                interaction = await strapi.query('interaction').create({
                    type: ENUM_INTERACTION_TYPE_REPORT_POST,
                    activity: activity.id,
                    post: post.id,
                    actor: memberId,
                    proposal: activity.proposal,
                    user: user.id,
                    action: [
                        {
                            __component: ENUM_INTERACTION_ACTION_REPORT,
                            status: 'UNRESOLVED',
                        },
                    ],
                });
            }
            post = await processReportOnPost(post.id, activity.proposal);
            const status = await this.postStatus(post.id, user);
            return { interaction, post, status };
        } catch (err) {
            strapi.log.warn(`post.createReportPost failed: postId = ${postId} memberId = ${memberId}\n%j`, err);
            throw convertQueryOperationError(err);
        }
    },
    async deleteReportPost(postId, activityId, memberId, user) {
        try {
            const post = await strapi.query('post').findOne({ id: postId });
            if (!post) {
                throw strapi.errors.notFound('notFound post');
            }

            const activity = await strapi.query('activity').findOne({ id: activityId }, []);
            if (!activity) {
                throw strapi.errors.notFound('notFound activity');
            }

            // check existence
            let interaction = await strapi.query('interaction').findOne({
                type: ENUM_INTERACTION_TYPE_REPORT_POST,
                activity: activity.id,
                post: post.id,
                proposal: activity.proposal,
                user: user.id,
            });
            if (interaction) {
                interaction = await strapi.query('interaction').delete({ id: interaction.id });
            }
            return {
                interaction,
                post: await processRestoreOnPost(post.id, activity.proposal),
                status: await this.postStatus(post.id, user),
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
                    if (!action || action.__component !== ENUM_INTERACTION_ACTION_LIKE || action.type !== 'LIKE') {
                        await strapi.services.interaction.update(
                            { id: foundInteraction.id },
                            {
                                action: [
                                    {
                                        __component: ENUM_INTERACTION_ACTION_LIKE,
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
                                __component: ENUM_INTERACTION_ACTION_LIKE,
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
    async createDefaultReadCount(post) {
        const writerId = getValueId(post.writer);
        const activityId = getValueId(post.activity);
        let proposal;
        if (post.activity?.id) {
            proposal = getValueId(post.activity.proposal);
        } else {
            const activity = await strapi.query('activity').findOne({ id: activityId }, []);
            proposal = getValueId(activity.proposal);
        }
        let founds = await strapi.query('member-role').find(
            {
                scope: ENUM_MEMBERROLE_SCOPE_PROPOSAL,
                status: ENUM_MEMBERROLE_STATUS_NORMAL,
                proposal,
                _sort: 'id',
                _limit: FETCH_LIMIT,
            },
            ['member'],
        );
        while (founds.length > 0) {
            await Promise.all(
                founds.map((found) => {
                    const actor = getValueId(found.member);
                    const user = found.member.user ? getValueId(found.member.user) : undefined;

                    if (actor === writerId) {
                        return;
                    }
                    return strapi.query('interaction').create({
                        type: ENUM_INTERACTION_TYPE_READ_POST,
                        activity: activityId,
                        post: post.id,
                        actor,
                        action: [
                            {
                                __component: ENUM_INTERACTION_ACTION_READ,
                                count: 0,
                            },
                        ],
                        user,
                    });
                }),
            );
            if (founds.length < FETCH_LIMIT) {
                break;
            }
            const lastId = founds[founds.length - 1].id;
            founds = await strapi.query('member-role').find(
                {
                    scope: ENUM_MEMBERROLE_SCOPE_PROPOSAL,
                    status: ENUM_MEMBERROLE_STATUS_NORMAL,
                    proposal,
                    id_gt: lastId,
                    _sort: 'id',
                    _limit: FETCH_LIMIT,
                },
                ['member'],
            );
        }
    },
};
