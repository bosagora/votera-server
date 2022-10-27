'use strict';

module.exports = {
    lifecycles: {
        async beforeCreate(data) {
            data.hasAssess = data.assessUpdate !== undefined && data.assessUpdate !== null;
            data.hasBallot = data.ballotUpdate !== undefined && data.ballotUpdate !== null;
        },
        async beforeUpdate(params, data) {
            if (data.assessUpdate === null) {
                data.hasAssess = false;
            } else if (data.assessUpdate !== undefined) {
                data.hasAssess = true;
            }
            if (data.ballotUpdate === null) {
                data.hasBallot = false;
            } else if (data.ballotUpdate !== undefined) {
                data.hasBallot = true;
            }
        },
    },
};
