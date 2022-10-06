module.exports = ({ env }) => ({
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    contact: {
        support: env('SUPPORT_MAIL', 'info@bosagora.io'),
    },
    cron: {
        enabled: true,
        redis: {
            enable: env.bool('CRON_REDIS_ENABLE', false),
            options: {
                host: env('CRON_REDIS_HOST'),
                port: env.int('CRON_REDIS_PORT', 6379),
                username: env('CRON_REDIS_USERNAME'),
                password: env('CRON_REDIS_PASSWORD'),
            },
        },
        ttl: env.int('CRON_LOCK_TTL', 300),
        feedExpireDays: env.int('CRON_FEED_EXPIRE_DAYS', 90),
    },
    admin: {
        auth: {
            secret: env('ADMIN_JWT_SECRET', '928be48179307cf15ce88d1b84c3779a'),
        },
    },
});
