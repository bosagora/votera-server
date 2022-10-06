'use strict';

module.exports = {
    fetchAuthenticatedUser(id) {
        return strapi.query('user', 'users-permissions').findOne({ id }, ['role', 'member', 'user_feed']);
    },
};
