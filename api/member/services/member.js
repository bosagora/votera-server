'use strict';
const crypto = require('crypto');
const { convertQueryOperationError } = require('../../../src/util/serviceError');

module.exports = {
    async createUser(username, email, password) {
        try {
            if (username !== email) {
                const userWithSameUsername = await strapi.query('user', 'users-permissions').findOne({ username });
                if (userWithSameUsername) {
                    throw strapi.errors.badRequest('Username already taken');
                }
            }
            const userWithSameEmail = await strapi
                .query('user', 'users-permissions')
                .findOne({ email: email.toLowerCase() });
            if (userWithSameEmail) {
                throw strapi.errors.badRequest('email already taken');
            }

            const user = {
                username,
                email,
                password,
                provider: 'local',
            };
            user.email = user.email.toLowerCase();
            const defaultRole = await strapi
                .query('role', 'users-permissions')
                .findOne({ type: strapi.config.onboarding.user.default_role }, []);
            user.role = defaultRole.id;

            const data = await strapi.plugins['users-permissions'].services.user.add(user);
            return { user: data, created: true };
        } catch (error) {
            strapi.log.warn(`member.createUser failed: email=${email}\n%j`, error);
            throw convertQueryOperationError(error);
        }
    },
    async signUpMember(address, username, signTime, signature, pushToken, locale) {
        const isValid = await strapi.services.validator.isValidSignUpSignature(address, username, signTime, signature);
        if (!isValid) {
            throw strapi.errors.badRequest('failed to verify signature');
        }

        const foundMember = await strapi.query('member').findOne({ address });
        if (foundMember) {
            throw strapi.errors.badRequest('Address already enrolled');
        }

        let userId;
        const userEmail = `${address}@votera.io`;
        const foundUser = await strapi.query('user', 'users-permissions').findOne({ email: userEmail });
        if (foundUser) {
            if (foundUser.blocked) {
                throw strapi.errors.forbidden('blocked account');
            }
            userId = foundUser.id;
        } else {
            const userPassword = crypto.randomBytes(16).toString('base64');
            const createdResult = await this.createUser(userEmail, userEmail, userPassword);
            userId = createdResult.user.id;
        }

        await strapi.services.member.create({
            address,
            username,
            lastAccessTime: new Date(),
            user: userId,
            status: 'OPEN',
            lastSignature: signature,
            lastSignTime: new Date(signTime).getTime(),
        });

        let push = null;

        const userFeed = {
            user: userId,
        };
        if (locale) {
            userFeed.locale = locale;
        }
        if (pushToken) {
            push = await strapi.query('push').findOne({ token: pushToken });
            if (push) {
                userFeed.pushes = [push.id];
            } else {
                push = await strapi.query('push').create({ token: pushToken, isActive: true });
                if (push) {
                    userFeed.pushes = [push.id];
                }
            }
        }
        await strapi.query('user-feed').create(userFeed);

        const user = await strapi.plugins['users-permissions'].services.user.edit({ id: userId }, { confirmed: true });
        const jwt = strapi.plugins['users-permissions'].services.jwt.issue({ id: userId });
        const feeds = await strapi.services.feeds.feedsStatus(user);
        return { jwt, user, push, feeds };
    },
    async signInMember(address, signTime, signature) {
        const isValid = await strapi.services.validator.isValidSignInSignature(address, signTime, signature);
        if (!isValid) {
            throw strapi.errors.unauthorized('failed to verify signature');
        }
        const found = await strapi.query('member').findOne({ address });
        if (!found) {
            throw strapi.errors.notFound('not found member');
        }
        if (!found.user) {
            throw strapi.errors.notFound('not found user');
        }
        if (found.user.blocked) {
            throw strapi.errors.forbidden('blocked account');
        }
        if (found.lastSignature === signature) {
            throw strapi.errors.badRequest('reused signature');
        }
        const signTimeValue = new Date(signTime).getTime();
        if (signTimeValue < found.lastSignTime) {
            throw strapi.errors.badRequest('revoked signature');
        }

        const user = await strapi.query('user', 'users-permissions').findOne({ id: found.user.id });
        const jwt = strapi.plugins['users-permissions'].services.jwt.issue({ id: user.id });
        const feeds = await strapi.services.feeds.feedsStatus(user);
        return { jwt, user, feeds };
    },
    async checkDupUserName(username) {
        try {
            const member = await strapi.query('member').findOne({ username });
            if (member) {
                return { username, duplicated: true };
            } else {
                return { username, duplicated: false };
            }
        } catch (err) {
            strapi.log.warn('checkDupUserName failed\n%j', err);
            throw convertQueryOperationError(err);
        }
    },
    /**
     * get member data and check ownership
     * @param {*} id
     * @param {*} user
     * @returns
     */
    async checkMemberUser(id, user) {
        try {
            const member = await strapi.query('member').findOne({ id }, []);
            if (member && member.status === 'DELETED') {
                return { member: null, authorized: false };
            }

            return {
                member,
                authorized: member && member.user === user.id,
            };
        } catch (err) {
            strapi.log.warn('checkMemberUser failed\n%j', err);
            throw convertQueryOperationError(err);
        }
    },
    /**
     * check input address and voter_card consistency with exist address
     * @param {*} oldMember
     * @param {*} newMember
     */
    async checkUpdateMemberParameter(oldMember, newMember) {
        if (newMember.address) {
            if (oldMember.address !== newMember.address) {
                throw strapi.errors.badRequest('invalid parameter');
            }
        }
        if (newMember.lastSignature || newMember.lastSignTime) {
            throw strapi.errors.badRequest('forbidden parameter');
        }
    },
    /**
     * authorize helper function called by controller
     * @param {*} memberId
     * @param {*} user
     * @param {*} ctx
     */
    async authorizeMember(memberId, user) {
        if (!memberId) throw strapi.errors.badRequest('missing parameter');
        if (!user) throw strapi.errors.unauthorized('unauthorized');

        const checkMember = await this.checkMemberUser(memberId, user);
        if (!checkMember.member) throw strapi.errors.badRequest('member.notFound');
        if (!checkMember.authorized) throw strapi.errors.unauthorized('member.unauthorized');

        return checkMember;
    },
    async authorizeMemberAddress(address, user) {
        if (!address) throw strapi.errors.badRequest('missing parameter');
        if (!user) throw strapi.errors.unauthorized('unauthorized');
        const member = await strapi.query('member').findOne({ address });
        if (!member) throw strapi.errors.badRequest('member.notFound');
        if (member.status === 'DELETED' || member.user.id !== user.id) {
            throw strapi.errors.unauthorized('member.unauthorized');
        }
    },
};
