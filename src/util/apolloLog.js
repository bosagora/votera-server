'use strict';

const { simplifyVariable } = require('./simplify');

const apolloPlugin = {
    serverWillStart() {
        strapi.log.info('Uniid ApolloServer plugin initialized');
    },
    requestDidStart(requestContext) {
        if (requestContext.request.operationName === 'IntrospectionQuery') {
            return;
        }

        const start = Date.now();
        const ctx = requestContext.context.context;
        const bearer = ctx.request?.header?.authorization ? ctx.request.header.authorization.slice(-9) : 'guest';

        const simpleVariable = requestContext.request.variables
            ? simplifyVariable(requestContext.request.variables)
            : '';

        return {
            willSendResponse(context) {
                const elapsed = Date.now() - start;
                strapi.log.debug(`${requestContext.request.operationName} (${elapsed} ms) ${bearer} ${simpleVariable}`);
            },
        };
    },
};

module.exports = {
    apolloPlugin,
};
