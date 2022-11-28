const nacl = require('tweetnacl');
const { blake2bInit, blake2bUpdate, blake2bFinal } = require('blakejs');

class VoteBox {
    static getNonceSize() {
        return nacl.box.nonceLength;
    }

    static generateNonce() {
        return nacl.randomBytes(nacl.box.nonceLength);
    }

    static encrypt(message, nonce, publicKey, secretKey) {
        const pk = nacl.ed2curve.convertPublicKey(publicKey);
        if (!pk) {
            return null;
        }
        const sk = nacl.ed2curve.convertSecretKey(secretKey);
        return nacl.box(message, nonce, pk, sk);
    }

    static open(cipherText, nonce, publicKey, secretKey) {
        const pk = nacl.ed2curve.convertPublicKey(publicKey);
        if (!pk) {
            return null;
        }
        const sk = nacl.ed2curve.convertSecretKey(secretKey);
        return nacl.box.open(cipherText, nonce, pk, sk);
    }

    static encryptSimple(message, publicKey, secretKey) {
        const nonce = VoteBox.generateNonce();
        const cipher = VoteBox.encrypt(message, nonce, publicKey, secretKey);
        if (!cipher) {
            return null;
        }
        const result = new Uint8Array(nonce.length + cipher.length);
        result.set(nonce);
        result.set(cipher, nonce.length);
        return result;
    }

    static openSimple(cipher, publicKey, secretKey) {
        const nonceSize = VoteBox.getNonceSize();
        if (cipher.length < nonceSize) {
            return null;
        }
        const nonce = cipher.slice(0, nonceSize);
        const cipherText = cipher.slice(nonceSize);
        return VoteBox.open(cipherText, nonce, publicKey, secretKey);
    }

    static #sealNonce(pk1, pk2) {
        const context = blake2bInit(nacl.box.nonceLength);
        blake2bUpdate(context, pk1);
        blake2bUpdate(context, pk2);
        return blake2bFinal(context);
    }

    static sealMake(message, publicKey) {
        const pk = nacl.ed2curve.convertPublicKey(publicKey);
        if (!pk) {
            return null;
        }
        const ekey = nacl.box.keyPair();
        const nonce = VoteBox.#sealNonce(ekey.publicKey, pk);
        const cipher = nacl.box(message, nonce, pk, ekey.secretKey);
        if (!cipher) {
            return null;
        }
        const sealCipher = new Uint8Array(ekey.publicKey.length + cipher.length);
        sealCipher.set(ekey.publicKey);
        sealCipher.set(cipher, ekey.publicKey.length);
        return sealCipher;
    }

    static sealOpen(cipher, publicKey, secretKey) {
        if (cipher.length < nacl.box.publicKeyLength + 16) {
            // 16 : MACBYTES
            return null;
        }
        const pk = nacl.ed2curve.convertPublicKey(publicKey);
        if (!pk) {
            return null;
        }
        const sk = nacl.ed2curve.convertSecretKey(secretKey);
        const epk = cipher.slice(0, nacl.box.publicKeyLength);
        const nonce = VoteBox.#sealNonce(epk, pk);
        return nacl.box.open(cipher.slice(nacl.box.publicKeyLength), nonce, epk, sk);
    }
}

module.exports = {
    VoteBox,
};
