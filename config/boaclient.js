module.exports = ({ env }) => ({
    chainId: env.int('BOSAGORA_CHAINID', 2020),
    providerUrl: env('BOSAGORA_PROVIDER_URL'),
    query: {
        url: env('BOSAGORA_QUERY_URL'),
        pageSize: env.int('BOSAGORA_QUERY_PAGE_SIZE', 1000),
    },
    signValidTime: env.int('BOSAGORA_SIGN_VALID_TIME', 600000), // 10 minutes
    wallet: {
        path: env('WALLET_PATH'),
        password: env('WALLET_PASSWORD'),
        voteKey: env('WALLET_VOTE_KEY'),
    },
    contract: {
        commonsBudget: env('COMMONS_BUDGET_ADDRESS'),
        voteraVote: env('VOTERA_VOTE_ADDRESS'),
        validatorSize: env.int('VOTERA_VOTE_VALIDATOR_SIZE', 500),
        revealBallotSize: env.int('VOTERA_VOTE_REVEALBALLOT_SIZE', 500),
    },
    transaction_wait: env.int('TRANSACTION_WAIT_TIME', 30000),
    transaction_retry_after: env.int('TRANSACTION_RETRY_AFTER', 90000),
    hmacKey: env('HMAC_KEY'),
});
