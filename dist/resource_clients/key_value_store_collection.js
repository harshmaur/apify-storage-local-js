"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyValueStoreCollectionClient = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = require("fs-extra");
const ow_1 = tslib_1.__importDefault(require("ow"));
const path_1 = require("path");
/**
 * Key-value store collection client.
 */
class KeyValueStoreCollectionClient {
    constructor({ storageDir }) {
        Object.defineProperty(this, "storageDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.storageDir = storageDir;
    }
    async list() {
        throw new Error('This method is not implemented in @apify/storage-local yet.');
    }
    async getOrCreate(name) {
        (0, ow_1.default)(name, ow_1.default.string.nonEmpty);
        const storePath = (0, path_1.join)(this.storageDir, name);
        await (0, fs_extra_1.ensureDir)(storePath);
        const stats = await (0, fs_extra_1.stat)(storePath);
        return {
            id: name,
            name,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            accessedAt: stats.atime,
        };
    }
}
exports.KeyValueStoreCollectionClient = KeyValueStoreCollectionClient;
//# sourceMappingURL=key_value_store_collection.js.map