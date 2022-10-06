# votera-server
Votera Server

## installation

votera server is using strapi with node

votera server is using strapi with node server
it requires version 14 or later.

Required module and package

1. mysql : used as database
2. redis : used for pubsub and redlock
3. s3 : used as file upload repository

configuration location and list

### mysql

config location: config/database.js

reference [strapi database configuration](https://docs-v3.strapi.io/developer-docs/latest/setup-deployment-guides/configurations.html#database)

- connections List of all available connections.
  - default
    - connector (string): Connector used by the current connection. Will be bookshelf.
    - settings Useful for external session stores such as Redis.
      - client (string): Database client to create the connection. sqlite or postgres or mysql.
      - host (string): Database host name. Default value: localhost.
      - port (integer): Database port.
      - database (string): Database name.
      - username (string): Username used to establish the connection.
      - password (string): Password used to establish the connection.
      - timezone (string): Set the default behavior for local time. Default value: utc  [Timezone options](https://www.php.net/manual/en/timezones.php)
      - schema (string): Set the default database schema. Used only for Postgres DB.
      - ssl (boolean/object): For ssl database connection. Object is used to pass certificate files as strings.
    - options Options used for database connection.
      - debug (boolean): Show database exchanges and errors.
      - autoMigration (boolean): To disable auto tables/columns creation for SQL database.
      - pool Options used for database connection pooling. For default value and more information, look at [Knex's pool config documentation](https://knexjs.org/#Installation-pooling)
        - min (integer): Minimum number of connections to keep in the pool.
        - max (integer): Maximum number of connections to keep in the pool.
        - acquireTimeoutMillis (integer): Maximum time in milliseconds to wait for acquiring a connection from the pool.
        - createTimeoutMillis (integer): Maximum time in milliseconds to wait for creating a connection to be added to the pool.
        - idleTimeoutMillis (integer): Number of milliseconds to wait before destroying idle connections.
        - reapIntervalMillis (integer): How often to check for idle connections in milliseconds.
        - createRetryIntervalMillis (integer): How long to idle after a failed create before trying again in milliseconds.

### redis (pubsub)

config location : config/pubsub.js

- service
  - enable : enable/disable pubsub
  - endpoint: url of pubsub
- redis (redis configuration for pubsub feature)
  - enable : enable/disable redis use for pubsub
  - options
    - host : redis host
    - port : redis port
    - username : username for redis connection
    - password : password for redis connection

### redis (cron redlock) and others for server

config location:  config/server.js

- host: service ip of strapi server
- port: listening port of strapi server
- contact:
  - support: support contact information
- cron: cron configuration
  - enabled: enable/disable cron service
  - redis: configuration for cron redlock
    - enable: enable/disable for redis for cron
    - options: cron redlock connection information
      - host : redis host
      - port : redis port
      - username : username for redis connection
      - password : password for redis connection
  - ttl: ttl (time to live) configuration of redlock

### s3 (upload configuration)

config location : config/plugins.js

can use other upload provider of strapi

[Strapi upload](https://strapi.io/documentation/developer-docs/latest/development/plugins/upload.html#models-definition)

- upload : Upload plugin configuration
  - provider : Upload plugin name
  - providerOptions :
    - accessKeyId : S3 Access Key ID
    - secretAccessKey : S3 Secret Access Key
    - region : S3 service region
    - params
      - Bucket : S3 Service bucket

### Bosagora configuration

config location: config/boaclient.js

- chainId
- providerUrl
- query
  - url
  - pageSize
- signValidTime
- wallet
  - path
  - password
  - voteKey
- contract
  - commonsBudget
  - voteraVote
  - validatorSize
  - revealBallotSize
- transaction_wait
- hmacKey

### Votera configuration

config location: config/votera.js
- proposalInfoHost :
- services :
  - assess_begin_offset :
  - assess_end_offset :
  - vote_begin_offset :
  - vote_end_offset :
  - vote_open :
  - can_withdraw_after :
- report
  - reportMinCount :
  - reportPercent :

# Votera Strapi Configuration

## Method for Authenticated permission

|Plugin|Name|Method|
|------|----|------|
|Application|Agora|find|
|Application|Ballot|submitBallot,recordBallot|
|Application|Feeds|count, find, findone, listFeeds, update|
|Application|Member|all|
|Application|Member-Role|count,find,findone|
|Application|Post|activityPosts, count, create, find, findone, listPosts, postComments, postStatus, readArticle, reportPost, restorePost, togglePostLike, update|
|Application|Proposal|assessResult, checkProposalFee, count, create, feePolicy, find, findbyid, findinfo, findone, joinProposal, listProposal, proposalFee, statusById, submitAssess, voteCount, voteStatus|
|Application|Validator|count,find,findone,getsignindomain,getsignupdomain,isvalidator,listAssessValidators,listBallotValidators|
|Application|Version|find|
|Upload|Upload|upload|
|Users-Permissions|User|me, updateuseralarmstatus, updateuserpushtoken|


### method for Public permission
|Plugin|Name|Method|
|------|----|------|
|Application|Agora|find|
|Application|Member|checkdupusername, count, find, findone, ismember, signinmember, signupmember|
|Application|MemberRole|count, find, findone|
|Application|Post|activityPosts, count, find, findone, listPosts, postComments, postStatus|
|Application|Proposal|assessResult, checkProposalFee, count, feePolicy, find, findbyid, findInfo, findone, listProposal, proposalFee, statusById, voteCount, voteStatus|
|Application|Validator|count, find, findone, getsignindomain,getsignupdomain,isvalidator,listAssessValidators, listBallotValidators|
|Application|Version|find|
|Users-Permissions|Auth|callback, connect, emailconfirmation, forgotpassword, register, resetpassword|
|Users-Permissions|User|me|

### Agora 
|Field|Description|
|-----|-----------|
|PrivacyTermUrl|url for privacy policy|
|UserServiceTermUrl|url for user service policy|
|CommonsBudgetAddress|address of commons budget contract|
|ProposalFundMin|1|
|ProposalFundMax||
|VoteraVoteAddress|address of votera vote contract|
|ProviderUrl|address of blockchain provider|
