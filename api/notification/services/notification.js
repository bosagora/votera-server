'use strict';

const { ENUM_INTERACTION_TYPE_LIKE_POST } = require('../../../src/types/interaction');
const { ENUM_POST_TYPE_COMMENT_ON_POST, ENUM_POST_TYPE_REPLY_ON_COMMENT } = require('../../../src/types/post');
const { getValueId } = require('../../../src/util/strapi_helper');

module.exports = {
    async onProposalCreated(proposal) {
        strapi.log.debug(`notification.onProposalCreated proposal.id = ${proposal.id}`);
        strapi.services.feedclient.onProposalCreated(proposal).catch((err) => {
            strapi.log.warn(`feedclient.onProposalCreated failed: proposal.id = ${proposal.id}`);
            strapi.log.warn(err);
        });
    },
    async onProposalUpdated(proposal) {
        strapi.log.debug(`notification.onProposalUpdated proposal.id = ${proposal.id}`);
        strapi.services.feedclient.onProposalUpdated(proposal).catch((err) => {
            strapi.log.warn(`feedclient.onProposalUpdated failed: proposal.id = ${proposal.id}`);
            strapi.log.warn(err);
        });
    },
    async onProposalTimeAlarm(proposal) {
        if (proposal.timeAlarm_notified) {
            return;
        }
        strapi.log.debug(`notification.onProposalUpdated proposal.id = ${proposal.id}`);
        try {
            await strapi.query('proposal').update({ id: proposal.id }, { timeAlarm_notified: true });
            strapi.services.feedclient.onProposalTimeAlarm(proposal).catch((err) => {
                strapi.log.warn(`feedclient.onProposalTimeAlarm failed: proposal.id = ${proposal.id}`);
                strapi.log.warn(err);
            });
        } catch (err) {
            strapi.log.warn(`notification.onProposalTimeAlarm failed: proposal.id = ${proposal.id}`);
            strapi.log.warn(err);
        }
    },
    async onPostCreated(post) {
        if (post.type === ENUM_POST_TYPE_COMMENT_ON_POST || post.type === ENUM_POST_TYPE_REPLY_ON_COMMENT) {
            if (getValueId(post.writer) === getValueId(post.parentPost.writer)) {
                // 자기 글에 자답 했을 경우 무시
                return;
            }
        }
        strapi.log.debug(`notification.onPostCreated post.id = ${post.id}`);
        strapi.services.feedclient.onPostCreated(post).catch((err) => {
            strapi.log.warn(`feedclient.onPostCreated failed: post.id = ${post.id}`);
            strapi.log.warn(err);
        });
    },
    async onInteractionCreated(interaction) {
        if (interaction.type === ENUM_INTERACTION_TYPE_LIKE_POST) {
            if (interaction.actor.id === interaction.post.writer) {
                // 자기 글에 자추했을 경우 무시
                return;
            }
        }
        strapi.services.feedclient.onInteractionCreated(interaction).catch((err) => {
            strapi.log.warn(`feedclient.onInteractionCreated failed: interaction.id = ${interaction.id}`);
            strapi.log.warn(err);
        });
    },
};
