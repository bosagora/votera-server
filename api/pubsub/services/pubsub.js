const { makeExecutableSchema, PubSub } = require('apollo-server-koa');
const { execute, subscribe } = require('graphql');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const Redis = require('ioredis');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');

const apolloPlugin = {
    async serverWillStart() {
        return {
            async drainServer() {
                if (strapi?.services?.pubsub?.serverCleanup) {
                    await strapi.services?.pubsub?.serverCleanup.dispose();
                }
            },
        };
    },
};

module.exports = {
    initialize: async () => {
        if (!strapi.config.pubsub.service.enable) {
            return;
        }
        console.log('🚀  Start API PubSub Server');

        if (strapi.config.pubsub?.redis?.enable && strapi.config.pubsub?.redis?.options) {
            const options = {
                ...strapi.config.pubsub.redis.options,
                retryStrategy: (times) => {
                    // reconnect after
                    return Math.min(times * 50, 2000);
                },
            };
            this.pubsub = new RedisPubSub({
                publisher: new Redis(options),
                subscriber: new Redis(options),
            });
        } else {
            this.pubsub = new PubSub();
        }

        const pubsubConfig = strapi.api.pubsub.config;
        const typeDefs = `
            ${pubsubConfig.definition}
            type Query {
                ${pubsubConfig.query}
            }
            type Subscription {
                ${pubsubConfig.subscription}
            }
        `;

        const schema = makeExecutableSchema({
            typeDefs,
            resolvers: pubsubConfig.resolver,
        });

        const wsServer = new WebSocketServer({
            server: strapi.server,
            path: strapi.config.pubsub.service.endpoint,
        });

        this.serverCleanup = useServer(
            {
                execute,
                subscribe,
                schema,
                onConnect: (context) => {
                    console.log('pubsub.connect.');
                    // if (context.connectionParams.authToken) {
                    //     return strapi.plugins['users-permissions'].services.jwt
                    //         .verify(context.connectionParams.authToken)
                    //         .then((data) => {
                    //             return strapi.plugins['users-permissions'].services.user.fetchAuthenticatedUser(
                    //                 data.id,
                    //             );
                    //         })
                    //         .then((user) => {
                    //             return { currentUser: user };
                    //         })
                    //         .catch((err) => {
                    //             throw err;
                    //         });
                    // }

                    // throw new Error('missing auth token');
                },
            },
            wsServer,
        );
    },

    publish: (triggerName, payload) => {
        return this.pubsub ? this.pubsub.publish(triggerName, payload) : Promise.resolve(null);
    },

    subscribe: (triggerName, onMessage) => {
        return this.pubsub ? this.pubsub.subscribe(triggerName, onMessage) : undefined;
    },

    unsubscribe: (subId) => {
        return this.pubsub ? this.pubsub.unsubscribe(subId) : undefined;
    },

    asyncIterator: (triggers) => {
        return this.pubsub ? this.pubsub.asyncIterator(triggers) : undefined;
    },

    apolloPlugin,
};
