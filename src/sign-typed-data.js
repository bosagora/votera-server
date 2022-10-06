'use strict';
var __spreadArray =
    (this && this.__spreadArray) ||
    function (to, from, pack) {
        if (pack || arguments.length === 2)
            for (var i = 0, l = from.length, ar; i < l; i++) {
                if (ar || !(i in from)) {
                    if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                    ar[i] = from[i];
                }
            }
        return to.concat(ar || Array.prototype.slice.call(from));
    };
exports.__esModule = true;
exports.recoverTypedSignature = exports.signTypedData = exports.TypedDataUtils = void 0;
var ethers_1 = require('ethers');
var utils_1 = require('ethers/lib/utils');
var SignTypedDataVersions = [
    'V1' /* SignTypedDataVersion.V1 */,
    'V3' /* SignTypedDataVersion.V3 */,
    'V4' /* SignTypedDataVersion.V4 */,
];
/**
 * Validate that the given value is a valid version string.
 *
 * @param version - The version value to validate.
 * @param allowedVersions - A list of allowed versions. If omitted, all versions are assumed to be
 * allowed.
 */
function validateVersion(version, allowedVersions) {
    if (!SignTypedDataVersions.includes(version)) {
        throw new Error(`Invalid version: '${version}'`);
    } else if (allowedVersions && !allowedVersions.includes(version)) {
        throw new Error(
            `SignTypedDataVersion not allowed: '${version}'. Allowed versions are: ${allowedVersions.join(', ')}`,
        );
    }
}
/**
 * Finds all types within a type definition object.
 *
 * @param primaryType - The root type.
 * @param types - Type definitions for all types included in the message.
 * @param results - The current set of accumulated types.
 * @returns The set of all types found in the type definition.
 */
function findTypeDependencies(primaryType, types, results) {
    if (results === void 0) {
        results = new Set();
    }
    var matchedType = primaryType.match(/^\w*/u);
    if (!matchedType) {
        return results;
    }
    var prmType = matchedType[0];
    if (results.has(prmType) || types[prmType] === undefined) {
        return results;
    }
    results.add(prmType);
    types[prmType].forEach(function (field) {
        findTypeDependencies(field.type, types, results);
    });
    return results;
}
/**
 * Encodes the type of an object by encoding a comma delimited list of its members.
 *
 * @param primaryType - The root type to encode.
 * @param types - Type definitions for all types included in the message.
 * @returns An encoded representation of the primary type.
 */
function encodeType(primaryType, types) {
    var result = '';
    var unsortedDeps = findTypeDependencies(primaryType, types);
    unsortedDeps['delete'](primaryType);
    var deps = __spreadArray([primaryType], Array.from(unsortedDeps).sort(), true);
    deps.forEach(function (type) {
        var children = types[type];
        if (!children) {
            throw new Error('No type definition specified: '.concat(type));
        }
        result += ''.concat(type, '(').concat(
            types[type]
                .map(function (_a) {
                    var name = _a.name,
                        t = _a.type;
                    return ''.concat(t, ' ').concat(name);
                })
                .join(','),
            ')',
        );
    });
    return result;
}
/**
 * Hashes the type of an object.
 *
 * @param primaryType - The root type to hash.
 * @param types - Type definitions for all types included in the message.
 * @returns The hash of the object type.
 */
function hashType(primaryType, types) {
    return ethers_1.utils.keccak256(Buffer.from(encodeType(primaryType, types), 'utf8'));
}
/**
 * Encodes an object by encoding and concatenating each of its members.
 *
 * @param primaryType - The root type.
 * @param data - The object to encode.
 * @param types - Type definitions for all types included in the message.
 * @param version - The EIP-712 version the encoding should comply with.
 * @returns An encoded representation of an object.
 */
function encodeData(primaryType, data, types, version) {
    validateVersion(version, ['V3' /* SignTypedDataVersion.V3 */, 'V4' /* SignTypedDataVersion.V4 */]);
    var encodedTypes = ['bytes32'];
    var encodedValues = [hashType(primaryType, types)];
    types[primaryType].forEach(function (field) {
        if (version === 'V3' /* SignTypedDataVersion.V3 */ && data[field.name] === undefined) {
            return;
        }
        var _a = encodeField(types, field.name, field.type, data[field.name], version),
            type = _a[0],
            value = _a[1];
        encodedTypes.push(type);
        encodedValues.push(value);
    });
    return ethers_1.utils.defaultAbiCoder.encode(encodedTypes, encodedValues);
}
/**
 * Hashes an object.
 *
 * @param primaryType - The root type.
 * @param data - The object to hash.
 * @param types - Type definitions for all types included in the message.
 * @param version - The EIP-712 version the encoding should comply with.
 * @returns The hash of the object.
 */
function hashStruct(primaryType, data, types, version) {
    validateVersion(version, ['V3' /* SignTypedDataVersion.V3 */, 'V4' /* SignTypedDataVersion.V4 */]);
    return ethers_1.utils.keccak256(encodeData(primaryType, data, types, version));
}
/**
 * Encode a single field.
 *
 * @param types - All type definitions.
 * @param name - The name of the field to encode.
 * @param type - The type of the field being encoded.
 * @param value - The value to encode.
 * @param version - The EIP-712 version the encoding should comply with.
 * @returns Encoded representation of the field.
 */
function encodeField(types, name, type, value, version) {
    validateVersion(version, ['V3' /* SignTypedDataVersion.V3 */, 'V4' /* SignTypedDataVersion.V4 */]);
    if (types[type] !== undefined) {
        return [
            'bytes32',
            version === 'V4' /* SignTypedDataVersion.V4 */ && value == null // eslint-disable-line no-eq-null
                ? '0x0000000000000000000000000000000000000000000000000000000000000000'
                : ethers_1.utils.keccak256(encodeData(type, value, types, version)),
        ];
    }
    if (value === undefined) {
        throw new Error('missing value for field '.concat(name, ' of type ').concat(type));
    }
    if (type === 'bytes') {
        return ['bytes32', ethers_1.utils.keccak256(value)];
    }
    if (type === 'string') {
        // convert string to buffer - prevents ethUtil from interpreting strings like '0xabcd' as hex
        if (typeof value === 'string') {
            return ['bytes32', ethers_1.utils.keccak256(Buffer.from(value, 'utf8'))];
        }
        return ['bytes32', ethers_1.utils.keccak256(value)];
    }
    if (type.lastIndexOf(']') === type.length - 1) {
        if (version === 'V3' /* SignTypedDataVersion.V3 */) {
            throw new Error('Arrays are unimplemented in encodeData; use V4 extension');
        }
        var parsedType_1 = type.slice(0, type.lastIndexOf('['));
        var typeValuePairs = value.map(function (item) {
            return encodeField(types, name, parsedType_1, item, version);
        });
        return [
            'bytes32',
            ethers_1.utils.keccak256(
                ethers_1.utils.defaultAbiCoder.encode(
                    typeValuePairs.map(function (_a) {
                        var t = _a[0];
                        return t;
                    }),
                    typeValuePairs.map(function (_a) {
                        var v = _a[1];
                        return v;
                    }),
                ),
            ),
        ];
    }
    return [type, value];
}
/**
 * Removes properties from a message object that are not defined per EIP-712.
 *
 * @param data - The typed message object.
 * @returns The typed message object with only allowed fields.
 */
function sanitizeData(data) {
    var types = data.types,
        primaryType = data.primaryType,
        domain = data.domain,
        message = data.message;
    if (!types.EIP712Domain) {
        types.EIP712Domain = [];
    }
    return { types: types, primaryType: primaryType, domain: domain, message: message };
}
/**
 * Hash a typed message according to EIP-712. The returned message starts with the EIP-712 prefix,
 * which is "1901", followed by the hash of the domain separator, then the data (if any).
 * The result is hashed again and returned.
 *
 * This function does not sign the message. The resulting hash must still be signed to create an
 * EIP-712 signature.
 *
 * @param typedData - The typed message to hash.
 * @param version - The EIP-712 version the encoding should comply with.
 * @returns The hash of the typed message.
 */
function eip712Hash(typedData, version) {
    validateVersion(version, ['V3' /* SignTypedDataVersion.V3 */, 'V4' /* SignTypedDataVersion.V4 */]);
    var sanitizedData = sanitizeData(typedData);
    var parts = [new Uint8Array([0x19, 0x01])];
    parts.push((0, utils_1.arrayify)(hashStruct('EIP712Domain', sanitizedData.domain, sanitizedData.types, version)));
    if (sanitizedData.primaryType !== 'EIP712Domain') {
        parts.push(
            (0, utils_1.arrayify)(
                hashStruct(sanitizedData.primaryType, sanitizedData.message, sanitizedData.types, version),
            ),
        );
    }
    return ethers_1.utils.keccak256(Buffer.concat(parts));
}
/**
 * A collection of utility functions used for signing typed data.
 */
exports.TypedDataUtils = {
    encodeData: encodeData,
    encodeType: encodeType,
    findTypeDependencies: findTypeDependencies,
    hashStruct: hashStruct,
    hashType: hashType,
    sanitizeData: sanitizeData,
    eip712Hash: eip712Hash,
};
/**
 * Sign typed data according to EIP-712. The signing differs based upon the `version`.
 *
 * V1 is based upon [an early version of EIP-712](https://github.com/ethereum/EIPs/pull/712/commits/21abe254fe0452d8583d5b132b1d7be87c0439ca)
 * that lacked some later security improvements, and should generally be neglected in favor of
 * later versions.
 *
 * V3 is based on [EIP-712](https://eips.ethereum.org/EIPS/eip-712), except that arrays and
 * recursive data structures are not supported.
 *
 * V4 is based on [EIP-712](https://eips.ethereum.org/EIPS/eip-712), and includes full support of
 * arrays and recursive data structures.
 *
 * @param options - The signing options.
 * @param options.privateKey - The private key to sign with.
 * @param options.data - The typed data to sign.
 * @param options.version - The signing version to use.
 * @returns The '0x'-prefixed hex encoded signature.
 */
function signTypedData(_a) {
    var privateKey = _a.privateKey,
        data = _a.data,
        version = _a.version;
    validateVersion(version);
    if (data === null || data === undefined) {
        throw new Error('Missing data parameter');
    } else if (privateKey === null || data === undefined) {
        throw new Error('Missing private key parameter');
    }
    var messageHash = exports.TypedDataUtils.eip712Hash(data, version);
    var signingKey = new utils_1.SigningKey(privateKey);
    var sig = signingKey.signDigest(messageHash);
    return ethers_1.utils.joinSignature(sig);
}
exports.signTypedData = signTypedData;
/**
 * Recover the address of the account that created the given EIP-712
 * signature. The version provided must match the version used to
 * create the signature.
 *
 * @param options - The signature recovery options.
 * @param options.data - The typed data that was signed.
 * @param options.signature - The '0x-prefixed hex encoded message signature.
 * @param options.version - The signing version to use.
 * @returns The '0x'-prefixed hex address of the signer.
 */
function recoverTypedSignature(_a) {
    var data = _a.data,
        signature = _a.signature,
        version = _a.version;
    validateVersion(version);
    if (data === null || data === undefined) {
        throw new Error('Missing data parameter');
    } else if (signature === null || data === undefined) {
        throw new Error('Missing signature parameter');
    }
    var messageHash = exports.TypedDataUtils.eip712Hash(data, version);
    var sig = ethers_1.utils.splitSignature(signature);
    return (0, utils_1.recoverAddress)(messageHash, sig);
}
exports.recoverTypedSignature = recoverTypedSignature;
