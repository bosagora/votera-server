'use strict';

module.exports = {
    definition: `
        input UpdateReceiptData {
            hash: String!
        }
        input UpdateReceiptInput {
            data: UpdateReceiptData
        }
        type UpdateReceiptPayload {
            status: Int
        }
    `,
    mutation: `
        updateReceipt(input: UpdateReceiptInput!): UpdateReceiptPayload
    `,
    resolver: {
        Mutation: {
            updateReceipt: {
                description: 'Update Transaction Receipt',
                resolver: 'application::transaction.transaction.updateReceipt',
            },
        },
    },
};
