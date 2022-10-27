const Boom = require('boom');

function convertQueryOperationError(err) {
    if (Boom.isBoom(err)) {
        return err;
    }
    if (err.name && err.name === 'MongoNetworkError') {
        return strapi.errors.badGateway(err.message);
    } else {
        return strapi.errors.badImplementation(err.message);
    }
}

module.exports = {
    convertQueryOperationError,
};
