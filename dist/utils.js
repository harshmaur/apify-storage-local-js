"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStream = exports.isBuffer = exports.uniqueKeyToRequestId = exports.mapRawDataToRequestQueueInfo = exports.purgeNullsFromObject = void 0;
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const ow_1 = tslib_1.__importDefault(require("ow"));
const consts_1 = require("./consts");
/**
 * Removes all properties with a null value
 * from the provided object.
 */
function purgeNullsFromObject(object) {
    if (object && typeof object === 'object' && !Array.isArray(object)) {
        for (const [key, value] of Object.entries(object)) {
            if (value === null)
                Reflect.deleteProperty(object, key);
        }
    }
    return object;
}
exports.purgeNullsFromObject = purgeNullsFromObject;
/**
 * Converts date strings to date objects and adds `id` alias for `name`.
 */
function mapRawDataToRequestQueueInfo(raw) {
    if (!raw) {
        return raw;
    }
    const queue = {
        ...raw,
        id: raw.name,
        createdAt: new Date(raw.createdAt),
        accessedAt: new Date(raw.accessedAt),
        modifiedAt: new Date(raw.modifiedAt),
    };
    return purgeNullsFromObject(queue);
}
exports.mapRawDataToRequestQueueInfo = mapRawDataToRequestQueueInfo;
/**
 * Creates a standard request ID (same as Platform).
 */
function uniqueKeyToRequestId(uniqueKey) {
    const str = (0, crypto_1.createHash)('sha256')
        .update(uniqueKey)
        .digest('base64')
        .replace(/([+/=])/g, '');
    return str.length > consts_1.REQUEST_ID_LENGTH ? str.substr(0, consts_1.REQUEST_ID_LENGTH) : str;
}
exports.uniqueKeyToRequestId = uniqueKeyToRequestId;
function isBuffer(value) {
    return ow_1.default.isValid(value, ow_1.default.any(ow_1.default.buffer, ow_1.default.arrayBuffer, ow_1.default.typedArray));
}
exports.isBuffer = isBuffer;
function isStream(value) {
    return ow_1.default.isValid(value, ow_1.default.object.hasKeys('on', 'pipe'));
}
exports.isStream = isStream;
//# sourceMappingURL=utils.js.map