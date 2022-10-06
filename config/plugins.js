const { apolloPlugin } = require('../api/pubsub/services/pubsub');

module.exports = {
    upload: {
        providerOptions: {
            sizeLimit: 10485760,
        },
    },
    graphql: {
        apolloServer: {
            plugins: [apolloPlugin],
        },
    },
};
