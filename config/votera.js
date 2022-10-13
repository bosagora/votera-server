module.exports = ({ env }) => ({
    proposalInfoHost: env('PROPOSAL_INFO_HOST'),
    services: {
        assess_begin_offset: env.int('ASSESS_BEGIN_OFFSET', 0),
        assess_end_offset: env.int('ASSESS_END_OFFSET', 86400),
        vote_begin_offset: env.int('VOTE_BEGIN_OFFSET', 0),
        vote_end_offset: env.int('VOTE_END_OFFSET', 86400),
        vote_open: env.int('VOTE_OPEN_TIME', 30),
        can_withdraw_after: env.int('WITHDRAW_AFTER', 86400),
    },
    report: {
        reportMinCount: env.int('VOTERA_REPORT_MINCOUNT', 10),
        reportPercent: env.int('VOTERA_REPORT_PERCENT', 10),
    },
});
