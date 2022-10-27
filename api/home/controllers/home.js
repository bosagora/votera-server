'use strict';

module.exports = {
    async find(ctx) {
        const handler = async () => {
            return Promise.resolve('helloWorld');
        };
        handler().catch((err) => {
            console.log('handler exception ', err);
        });
    },
};
