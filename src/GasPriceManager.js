const { BigNumber, ethers } = require('ethers');

class GasPriceManager extends ethers.Signer {
    constructor(signer) {
        super();
        this.signer = signer;
        ethers.utils.defineReadOnly(this, 'signer', signer);
        ethers.utils.defineReadOnly(this, 'provider', signer.provider || null);
    }

    connect(provider) {
        return new GasPriceManager(this.signer.connect(provider));
    }

    getAddress() {
        return this.signer.getAddress();
    }

    getTransactionCount(blockTag) {
        return this.signer.getTransactionCount(blockTag);
    }

    signMessage(message) {
        return this.signer.signMessage(message);
    }

    signTransaction(transaction) {
        return this.signer.signTransaction(transaction);
    }

    sendTransaction(transaction) {
        const provider = this.signer.provider;
        if (!provider) {
            const maxPriorityFeePerGas = 1500000000;
            const maxFeePerGas = maxPriorityFeePerGas;
            transaction.maxPriorityFeePerGas = BigNumber.from(maxPriorityFeePerGas);
            transaction.maxFeePerGas = BigNumber.from(maxFeePerGas);
            return this.signer.sendTransaction(transaction);
        }
        return provider.getBlock('latest').then((block) => {
            const baseFeePerGas = block.baseFeePerGas != null ? block.baseFeePerGas.toNumber() : 0;
            const maxPriorityFeePerGas = 1500000000;
            const maxFeePerGas = Math.floor(baseFeePerGas * 1.265625) + maxPriorityFeePerGas;
            transaction.maxPriorityFeePerGas = BigNumber.from(maxPriorityFeePerGas);
            transaction.maxFeePerGas = BigNumber.from(maxFeePerGas);
            return this.signer.sendTransaction(transaction);
        });
    }
}

module.exports = {
    GasPriceManager,
};
