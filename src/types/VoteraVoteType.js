'use strict';

const ENUM_VOTE_STATE_INVALID = 0;
const ENUM_VOTE_STATE_CREATED = 1;
const ENUM_VOTE_STATE_SETTING = 2;
const ENUM_VOTE_STATE_ASSESSING = 3;
const ENUM_VOTE_STATE_RUNNING = 4;
const ENUM_VOTE_STATE_FINISHED = 5;

const ENUM_CANDIDATE_BLANK = 0;
const ENUM_CANDIDATE_YES = 1;
const ENUM_CANDIDATE_NO = 2;
const ENUM_CANDIDATE_MAX = 2;

module.exports = {
    ENUM_VOTE_STATE_INVALID,
    ENUM_VOTE_STATE_CREATED,
    ENUM_VOTE_STATE_SETTING,
    ENUM_VOTE_STATE_ASSESSING,
    ENUM_VOTE_STATE_RUNNING,
    ENUM_VOTE_STATE_FINISHED,
    ENUM_CANDIDATE_BLANK,
    ENUM_CANDIDATE_YES,
    ENUM_CANDIDATE_NO,
    ENUM_CANDIDATE_MAX,
};
