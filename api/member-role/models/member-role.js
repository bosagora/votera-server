'use strict';

const {
    ENUM_MEMBERROLE_SCOPE_PROPOSAL,
    ENUM_MEMBERROLE_SCOPE_ACTIVITY,
    ENUM_MEMBERROLE_STATUS_NORMAL,
    ENUM_MEMBERROLE_STATUS_BLOCK,
    ENUM_MEMBERROLE_STATUS_PENDING,
    ENUM_MEMBERROLE_STATUS_LEAVE,
} = require('../../../src/types/member-role');
const {
    connectionIsMongoose,
    increaseProposalMemberCountBookshelf,
    increaseProposalMemberCountMongoose,
    increaseActivityMemberCountBookshelf,
    increaseActivityMemberCountMongoose,
} = require('../../../src/util/strapi_helper');

let increaseProposalMemberCount;
let increaseActivityMemberCount;

function chooseModelFunction() {
    if (connectionIsMongoose()) {
        increaseProposalMemberCount = increaseProposalMemberCountMongoose;
        increaseActivityMemberCount = increaseActivityMemberCountMongoose;
    } else {
        increaseProposalMemberCount = increaseProposalMemberCountBookshelf;
        increaseActivityMemberCount = increaseActivityMemberCountBookshelf;
    }
}

async function increaseMemberCount(memberRole, count) {
    if (memberRole.scope === ENUM_MEMBERROLE_SCOPE_PROPOSAL) {
        await increaseProposalMemberCount(memberRole.proposal?.id, count);
    } else if (memberRole.scope === ENUM_MEMBERROLE_SCOPE_ACTIVITY) {
        await increaseActivityMemberCount(memberRole.activity?.id, count);
    }
}

async function memberRoleCreated(memberRole) {
    if (memberRole.scope !== ENUM_MEMBERROLE_SCOPE_PROPOSAL && memberRole.scope !== ENUM_MEMBERROLE_SCOPE_ACTIVITY) {
        return;
    }
    if (memberRole.status !== ENUM_MEMBERROLE_STATUS_NORMAL && memberRole.status !== ENUM_MEMBERROLE_STATUS_BLOCK) {
        return;
    }
    await increaseMemberCount(memberRole, 1);
}

async function memberRoleUpdated(memberRole, data) {
    if (memberRole.scope !== ENUM_MEMBERROLE_SCOPE_PROPOSAL && memberRole.scope !== ENUM_MEMBERROLE_SCOPE_ACTIVITY) {
        return;
    }
    if (memberRole.sattus === data.status) {
        return;
    }
    switch (memberRole.status) {
        case ENUM_MEMBERROLE_STATUS_PENDING:
        case ENUM_MEMBERROLE_STATUS_LEAVE:
            if (data.status === ENUM_MEMBERROLE_STATUS_NORMAL || data.status === ENUM_MEMBERROLE_STATUS_BLOCK) {
                await increaseMemberCount(memberRole, 1);
            }
            break;
        case ENUM_MEMBERROLE_STATUS_NORMAL:
        case ENUM_MEMBERROLE_STATUS_BLOCK:
            if (data.status === ENUM_MEMBERROLE_STATUS_LEAVE || data.status === ENUM_MEMBERROLE_STATUS_PENDING) {
                await increaseMemberCount(memberRole, -1);
            }
            break;
        default:
            break;
    }
}

async function memberRoleDeleted(memberRole) {
    if (memberRole.scope !== ENUM_MEMBERROLE_SCOPE_PROPOSAL && memberRole.scope !== ENUM_MEMBERROLE_SCOPE_ACTIVITY) {
        return;
    }
    switch (memberRole.status) {
        case ENUM_MEMBERROLE_STATUS_NORMAL:
        case ENUM_MEMBERROLE_STATUS_BLOCK:
            await increaseMemberCount(memberRole, -1);
            break;
        default:
            break;
    }
}

module.exports = {
    lifecycles: {
        async afterCreate(result) {
            if (!increaseProposalMemberCount) {
                chooseModelFunction();
            }
            try {
                await memberRoleCreated(result);
            } catch (err) {
                console.log('member-role.afterCreate catch: ', err);
            }
        },
        async beforeUpdate(params, data) {
            if (!increaseProposalMemberCount) {
                chooseModelFunction();
            }
            try {
                if (!data.status) {
                    return;
                }

                const memberRoles = await strapi.query('member-role').find(params);
                if (memberRoles?.length) {
                    for (let i = 0; i < memberRoles.length; i += 1) {
                        await memberRoleUpdated(memberRoles[i], data);
                    }
                }
            } catch (err) {
                console.error('member-role.beforeUpdate catch: ', err);
            }
        },
        async afterDelete(result, params) {
            if (!increaseProposalMemberCount) {
                chooseModelFunction();
            }
            try {
                if (Array.isArray(result)) {
                    for (let i = 0; i < result.length; i += 1) {
                        await memberRoleDeleted(result[i]);
                    }
                } else {
                    await memberRoleDeleted(result);
                }
            } catch (err) {
                console.error('member-role.afterDelete catch: ', err);
            }
        },
    },
};
