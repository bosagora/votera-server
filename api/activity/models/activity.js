'use strict';

module.exports = {
    lifecycles: {
        async beforeCreate(data) {
            if (data.commentCount === undefined) {
                data.commentCount = 0;
            }
            if (data.readCount === undefined) {
                data.readCount = 0;
            }
            if (data.participantCount === undefined) {
                data.participantCount = 0;
            }
            if (data.memberCount === undefined) {
                data.memberCount = 0;
            }
        },
    },
};
