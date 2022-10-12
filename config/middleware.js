module.exports = ({ env }) => ({
    settings: {
        xframe: {
            enabled: env.bool('XFRAME_ENABLE', true),
        },
        cors: {
            origin: [env('VOTERA_HOME_HOST', 'http://localhost'), env('VOTERA_ADMIN_HOST', 'http://localhost:1337')],
        },
        logger: {
            requests: false,
        },
    },
});
