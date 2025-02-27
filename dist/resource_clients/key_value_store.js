"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyValueStoreClient = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = require("fs-extra");
const mime_types_1 = tslib_1.__importDefault(require("mime-types"));
const ow_1 = tslib_1.__importDefault(require("ow"));
const path_1 = require("path");
const stream_1 = tslib_1.__importDefault(require("stream"));
const util_1 = tslib_1.__importDefault(require("util"));
const utils_1 = require("../utils");
const body_parser_1 = require("../body_parser");
const consts_1 = require("../consts");
const DEFAULT_LOCAL_FILE_EXTENSION = 'bin';
const COMMON_LOCAL_FILE_EXTENSIONS = ['json', 'jpeg', 'png', 'html', 'jpg', 'bin', 'txt', 'xml', 'pdf', 'mp3', 'js', 'css', 'csv'];
const streamFinished = util_1.default.promisify(stream_1.default.finished);
/**
 * Key-value Store client.
 */
class KeyValueStoreClient {
    constructor({ name, storageDir }) {
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "storeDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = name;
        this.storeDir = (0, path_1.join)(storageDir, name);
    }
    async get() {
        try {
            const stats = await (0, fs_extra_1.stat)(this.storeDir);
            // The platform treats writes as access, but filesystem does not,
            // so if the modification time is more recent, use that.
            const accessedTimestamp = Math.max(stats.atimeMs, stats.mtimeMs);
            return {
                id: this.name,
                name: this.name,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                accessedAt: new Date(accessedTimestamp),
            };
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
        }
        return undefined;
    }
    async update(newFields) {
        // The validation is intentionally loose to prevent issues
        // when swapping to a remote storage in production.
        (0, ow_1.default)(newFields, ow_1.default.object.partialShape({
            name: ow_1.default.optional.string.minLength(1),
        }));
        if (!newFields.name)
            return {};
        const newPath = (0, path_1.join)((0, path_1.dirname)(this.storeDir), newFields.name);
        try {
            await (0, fs_extra_1.move)(this.storeDir, newPath);
        }
        catch (err) {
            if (/dest already exists/.test(err.message)) {
                throw new Error('Key-value store name is not unique.');
            }
            else if (err.code === 'ENOENT') {
                this._throw404();
            }
            else {
                throw err;
            }
        }
        this.name = newFields.name;
        return { name: this.name };
    }
    async delete() {
        await (0, fs_extra_1.remove)(this.storeDir);
    }
    async listKeys(options = {}) {
        (0, ow_1.default)(options, ow_1.default.object.exactShape({
            limit: ow_1.default.optional.number.greaterThan(0),
            exclusiveStartKey: ow_1.default.optional.string,
        }));
        const { limit = consts_1.DEFAULT_API_PARAM_LIMIT, exclusiveStartKey, } = options;
        let files;
        try {
            files = await (0, fs_extra_1.readdir)(this.storeDir);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                this._throw404();
            }
            else {
                throw new Error(`Error listing files in directory '${this.storeDir}'.\nCause: ${err.message}`);
            }
        }
        const items = [];
        for (const file of files) {
            try {
                const { size } = await (0, fs_extra_1.stat)(this._resolvePath(file));
                items.push({
                    key: (0, path_1.parse)(file).name,
                    size,
                });
            }
            catch (e) {
                if (e.code !== 'ENOENT')
                    throw e;
            }
        }
        // Lexically sort to emulate API.
        items.sort((a, b) => {
            if (a.key < b.key)
                return -1;
            if (a.key > b.key)
                return 1;
            return 0;
        });
        let truncatedItems = items;
        if (exclusiveStartKey) {
            const keyPos = items.findIndex((item) => item.key === exclusiveStartKey);
            if (keyPos !== -1)
                truncatedItems = items.slice(keyPos + 1);
        }
        const limitedItems = truncatedItems.slice(0, limit);
        const lastItemInStore = items[items.length - 1];
        const lastSelectedItem = limitedItems[limitedItems.length - 1];
        const isLastSelectedItemAbsolutelyLast = lastItemInStore === lastSelectedItem;
        const nextExclusiveStartKey = isLastSelectedItemAbsolutelyLast
            ? undefined
            : lastSelectedItem.key;
        this._updateTimestamps();
        return {
            count: items.length,
            limit,
            exclusiveStartKey,
            isTruncated: !isLastSelectedItemAbsolutelyLast,
            nextExclusiveStartKey,
            items: limitedItems,
        };
    }
    /**
     * Tests whether a record with the given key exists in the key-value store without retrieving its value.
     * @param key The queried record key.
     * @returns `true` if the record exists, `false` otherwise.
     */
    async recordExists(key) {
        (0, ow_1.default)(key, ow_1.default.string);
        try {
            const result = await this._handleFile(key, fs_extra_1.stat);
            return !!result;
        }
        catch (err) {
            if (err.code === 'ENOENT')
                return false;
            throw new Error(`Error checking file '${key}' in directory '${this.storeDir}'.\nCause: ${err.message}`);
        }
    }
    async getRecord(key, options = {}) {
        (0, ow_1.default)(key, ow_1.default.string);
        (0, ow_1.default)(options, ow_1.default.object.exactShape({
            buffer: ow_1.default.optional.boolean,
            stream: ow_1.default.optional.boolean,
            // This option is ignored, but kept here
            // for validation consistency with API client.
            disableRedirect: ow_1.default.optional.boolean,
        }));
        const handler = options.stream ? fs_extra_1.createReadStream : fs_extra_1.readFile;
        let result;
        try {
            result = await this._handleFile(key, handler);
            if (!result)
                return;
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                throw err;
            }
            else {
                throw new Error(`Error reading file '${key}' in directory '${this.storeDir}'.\nCause: ${err.message}`);
            }
        }
        const record = {
            key,
            value: result.returnValue,
            contentType: mime_types_1.default.contentType(result.fileName),
        };
        const shouldParseBody = !(options.buffer || options.stream);
        if (shouldParseBody) {
            record.value = (0, body_parser_1.maybeParseBody)(record.value, record.contentType);
        }
        this._updateTimestamps();
        return record;
    }
    async setRecord(record) {
        (0, ow_1.default)(record, ow_1.default.object.exactShape({
            key: ow_1.default.string,
            value: ow_1.default.any(ow_1.default.null, ow_1.default.string, ow_1.default.number, ow_1.default.object),
            contentType: ow_1.default.optional.string.nonEmpty,
        }));
        const { key } = record;
        let { value, contentType } = record;
        const isValueStreamOrBuffer = (0, utils_1.isStream)(value) || (0, utils_1.isBuffer)(value);
        // To allow saving Objects to JSON without providing content type
        if (!contentType) {
            if (isValueStreamOrBuffer)
                contentType = 'application/octet-stream';
            else if (typeof value === 'string')
                contentType = 'text/plain; charset=utf-8';
            else
                contentType = 'application/json; charset=utf-8';
        }
        const extension = mime_types_1.default.extension(contentType) || DEFAULT_LOCAL_FILE_EXTENSION;
        const filePath = this._resolvePath(`${key}.${extension}`);
        const isContentTypeJson = extension === 'json';
        if (isContentTypeJson && !isValueStreamOrBuffer && typeof value !== 'string') {
            try {
                value = JSON.stringify(value, null, 2);
            }
            catch (err) {
                const msg = `The record value cannot be stringified to JSON. Please provide other content type.\nCause: ${err.message}`;
                throw new Error(msg);
            }
        }
        try {
            if ((0, utils_1.isStream)(value)) {
                const writeStream = value.pipe((0, fs_extra_1.createWriteStream)(filePath));
                await streamFinished(writeStream);
            }
            else {
                await (0, fs_extra_1.writeFile)(filePath, value);
            }
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                this._throw404();
            }
            else {
                throw new Error(`Error writing file '${key}' in directory '${this.storeDir}'.\nCause: ${err.message}`);
            }
        }
        this._updateTimestamps({ mtime: true });
    }
    async deleteRecord(key) {
        (0, ow_1.default)(key, ow_1.default.string);
        try {
            const result = await this._handleFile(key, fs_extra_1.unlink);
            if (result)
                this._updateTimestamps({ mtime: true });
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                throw err;
            }
            else {
                throw new Error(`Error deleting file '${key}' in directory '${this.storeDir}'.\nCause: ${err.message}`);
            }
        }
    }
    /**
     * Helper function to resolve file paths.
     * @private
     */
    _resolvePath(fileName) {
        return (0, path_1.resolve)(this.storeDir, fileName);
    }
    /**
     * Helper function to handle files. Accepts a promisified 'fs' function as a second parameter
     * which will be executed against the file saved under the key. Since the file's extension and thus
     * full path is not known, it first performs a check against common extensions. If no file is found,
     * it will read a full list of files in the directory and attempt to find the file again.
     *
     * Returns an object when a file is found and handler executes successfully, undefined otherwise.
     * @private
     */
    async _handleFile(key, handler) {
        for (const extension of COMMON_LOCAL_FILE_EXTENSIONS) {
            const fileName = `${key}.${extension}`;
            const result = await this._invokeHandler(fileName, handler);
            if (result)
                return result;
        }
        const fileName = await this._findFileNameByKey(key);
        if (fileName)
            return this._invokeHandler(fileName, handler);
        return undefined;
    }
    async _invokeHandler(fileName, handler) {
        try {
            const filePath = this._resolvePath(fileName);
            const returnValue = await handler(filePath);
            return { returnValue, fileName };
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
            return undefined;
        }
    }
    /**
     * Performs a lookup for a file in the local emulation directory's file list.
     * @private
     */
    async _findFileNameByKey(key) {
        try {
            const files = await (0, fs_extra_1.readdir)(this.storeDir);
            return files.find((file) => key === (0, path_1.parse)(file).name);
        }
        catch (err) {
            if (err.code === 'ENOENT')
                this._throw404();
            throw err;
        }
    }
    _throw404() {
        const err = new Error(`Key-value store with id: ${this.name} does not exist.`);
        // @ts-expect-error Adding fs-like code to the error
        err.code = 'ENOENT';
        throw err;
    }
    _updateTimestamps({ mtime } = {}) {
        // It's throwing EINVAL on Windows. Not sure why,
        // so the function is a best effort only.
        const now = new Date();
        let promise;
        if (mtime) {
            promise = (0, fs_extra_1.utimes)(this.storeDir, now, now);
        }
        else {
            promise = (0, fs_extra_1.stat)(this.storeDir)
                .then((stats) => (0, fs_extra_1.utimes)(this.storeDir, now, stats.mtime));
        }
        promise.catch(() => { });
    }
}
exports.KeyValueStoreClient = KeyValueStoreClient;
//# sourceMappingURL=key_value_store.js.map