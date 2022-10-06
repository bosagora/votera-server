'use strict';

const {
    ENUM_ACTIVITY_TYPE_BOARD,
    ENUM_ACTIVITY_TYPE_POLL,
    ENUM_ACTIVITY_TYPE_SURVEY,
} = require('../../../src/types/activity');
const { ENUM_QUESTION_TYPE_SCALE, ENUM_QUESTION_TYPE_SINGLE_CHOICE } = require('../../../src/types/question');

async function createBoardActivity(data) {
    try {
        const createdActivity = await strapi.services.activity.create(data);
        return createdActivity;
    } catch (err) {
        strapi.log.warn('createBoardActivity failed:');
        strapi.log.warn(err);
        throw err;
    }
}

async function createPollActivity(data) {
    try {
        const createdActivity = await strapi.services.activity.create(data);

        const createdPoll = await strapi.services.poll.create({
            activity: createdActivity.id,
            creator: createdActivity.creator.id,
        });

        const items = [
            { text: 'YES', value: 1, sequence: 0 },
            { text: 'NO', value: 2, sequence: 1 },
            { text: 'BLANK', value: 0, sequence: 2 },
        ];
        await strapi.services.question.create({
            title: `${createdActivity.id}.poll`,
            type: ENUM_QUESTION_TYPE_SINGLE_CHOICE,
            content: [
                {
                    __component: 'activity.choice-option-list',
                    item: items,
                },
            ],
            sequence: 0,
            poll: createdPoll.id,
        });

        return createdActivity;
    } catch (err) {
        strapi.log.warn('createPollActivity failed:');
        strapi.log.warn(err);
        throw err;
    }
}

async function createSurveyActivity(data) {
    try {
        const createdActivity = await strapi.services.activity.create(data);

        const createdSurvey = await strapi.services.survey.create({
            activity: createdActivity.id,
            creator: createdActivity.creator.id,
            type: 'REALTIME',
        });

        const scaleResults = [];

        const questions = ['completeness', 'realization', 'profitability', 'attractiveness', 'expansion'];
        for (let i = 0; i < questions.length; i += 1) {
            const q = questions[i];
            const question = await strapi.services.question.create({
                title: q,
                description: `${q} for activity: ${createdActivity.id}`,
                type: ENUM_QUESTION_TYPE_SCALE,
                content: [
                    {
                        __component: 'activity.scale-option',
                        min: 1,
                        max: 10,
                    },
                ],
                sequence: i,
                survey: createdSurvey.id,
            });
            // from min to max
            for (let value = 1; value <= 10; value += 1) {
                scaleResults.push({
                    __component: 'survey.scale-result',
                    value,
                    question: question.id,
                    sequence: i,
                    count: 0,
                });
            }
        }

        await strapi.services.survey.update({ id: createdSurvey.id }, { scaleResults });
        return createdActivity;
    } catch (err) {
        strapi.log.warn('createSurveyActivity failed:');
        strapi.log.warn(err);
        throw err;
    }
}

module.exports = {
    async createVoteraActivity(data) {
        switch (data.type) {
            case ENUM_ACTIVITY_TYPE_BOARD:
                return createBoardActivity(data);
            case ENUM_ACTIVITY_TYPE_POLL:
                return createPollActivity(data);
            case ENUM_ACTIVITY_TYPE_SURVEY:
                return createSurveyActivity(data);
            default:
                throw new Error('unknown type');
        }
    },
};
