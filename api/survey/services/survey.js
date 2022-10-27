'use strict';

const {
    increaseSurveyScaleResultMongoose,
    increaseSurveyScaleResultBookshelf,
    connectionIsMongoose,
} = require('../../../src/util/strapi_helper');

let increaseSurveyScaleResult;

function chooseModelFunction() {
    if (connectionIsMongoose()) {
        increaseSurveyScaleResult = increaseSurveyScaleResultMongoose;
    } else {
        increaseSurveyScaleResult = increaseSurveyScaleResultBookshelf;
    }
}

async function updateScaleResultComponent(survey, content, count) {
    const component = survey.scaleResults.find((sr) => sr.sequence === content.sequence && sr.value === content.value);
    if (!component) {
        return;
    }

    await increaseSurveyScaleResult(component.id, count);
}

module.exports = {
    async addSurveyScaleResults(surveyId, post) {
        if (!increaseSurveyScaleResult) {
            chooseModelFunction();
        }

        if (!surveyId || !post?.content) {
            return;
        }

        const survey = await strapi.query('survey').findOne({ id: surveyId });

        for (let i = 0; i < post.content.length; i += 1) {
            const content = post.content[i];
            if (content.__component === 'post.scale-answer') {
                await updateScaleResultComponent(survey, content, 1);
            }
        }
    },

    async subtractSurveyScaleResults(surveyId, post) {
        if (!increaseSurveyScaleResult) {
            chooseModelFunction();
        }

        if (!surveyId || !post?.content) {
            return;
        }

        const survey = await strapi.query('survey').findOne({ id: surveyId });

        for (let i = 0; i < post.content.length; i += 1) {
            const content = post.content[i];
            if (content.__component === 'post.scale-answer') {
                await updateScaleResultComponent(survey, content, -1);
            }
        }
    },
};
