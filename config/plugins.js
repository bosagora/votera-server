const { apolloPlugin } = require('../api/pubsub/services/pubsub');

module.exports = ({ env }) => ({
    upload: {
        provider: 'aws-s3',
        providerOptions: {
            accessKeyId: env('AWS_S3_ACCESS_KEY_ID'),
            secretAccessKey: env('AWS_S3_SECRET_ACCESS_KEY'),
            region: env('AWS_S3_REGION'),
            params: {
                Bucket: env('AWS_S3_BUCKET'),
            },
            sizeLimit: 10485760,
        },
    },
    graphql: {
        apolloServer: {
            plugins: [apolloPlugin],
        },
    },
});
