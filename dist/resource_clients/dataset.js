"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetClient = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = require("fs-extra");
const ow_1 = tslib_1.__importDefault(require("ow"));
const path_1 = require("path");
/**
 * This is what API returns in the x-apify-pagination-limit
 * header when no limit query parameter is used.
 */
const LIST_ITEMS_LIMIT = 999999999999;
/**
 * Number of characters of the dataset item file names.
 * E.g.: 000000019.json - 9 digits
 */
const LOCAL_FILENAME_DIGITS = 9;
class DatasetClient {
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
        Object.defineProperty(this, "itemCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: undefined
        });
        this.name = name;
        this.storeDir = (0, path_1.join)(storageDir, name);
    }
    async get() {
        try {
            this._ensureItemCount();
            const stats = await (0, fs_extra_1.stat)(this.storeDir);
            // The platform treats writes as access, but filesystem does not,
            // so if the modification time is more recent, use that.
            const accessedTimestamp = Math.max(stats.mtime.getTime(), stats.atime.getTime());
            return {
                id: this.name,
                name: this.name,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                accessedAt: new Date(accessedTimestamp),
                itemCount: this.itemCount,
            };
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
            return undefined;
        }
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
                throw new Error('Dataset name is not unique.');
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
        this.itemCount = undefined;
    }
    async downloadItems() {
        throw new Error('This method is not implemented in @apify/storage-local yet.');
    }
    async listItems(options = {}) {
        this._ensureItemCount();
        // The extra code is to enable a custom validation message.
        (0, ow_1.default)(options, ow_1.default.object.validate((value) => ({
            validator: ow_1.default.isValid(value, ow_1.default.object.exactShape({
                // clean: ow.optional.boolean,
                desc: ow_1.default.optional.boolean,
                // fields: ow.optional.array.ofType(ow.string),
                // omit: ow.optional.array.ofType(ow.string),
                limit: ow_1.default.optional.number,
                offset: ow_1.default.optional.number,
                // skipEmpty: ow.optional.boolean,
                // skipHidden: ow.optional.boolean,
                // unwind: ow.optional.string,
            })),
            message: 'Local dataset emulation supports only the "desc", "limit" and "offset" options.',
        })));
        const { limit = LIST_ITEMS_LIMIT, offset = 0, desc, } = options;
        const [start, end] = this._getStartAndEndIndexes(desc ? Math.max(this.itemCount - offset - limit, 0) : offset, limit);
        const items = [];
        for (let idx = start; idx < end; idx++) {
            const item = await this._readAndParseFile(idx);
            items.push(item);
        }
        this._updateTimestamps();
        return {
            items: desc ? items.reverse() : items,
            total: this.itemCount,
            offset,
            count: items.length,
            limit,
        };
    }
    async pushItems(items) {
        this._ensureItemCount();
        (0, ow_1.default)(items, ow_1.default.any(ow_1.default.object, ow_1.default.string, ow_1.default.array.ofType(ow_1.default.any(ow_1.default.object, ow_1.default.string))));
        items = this._normalizeItems(items);
        const promises = items.map((item) => {
            this.itemCount++;
            // We normalized the items to objects and now stringify them back to JSON,
            // because we needed to inspect the contents of the strings. They could
            // be JSON arrays which we need to split into individual items.
            const finalItem = JSON.stringify(item, null, 2);
            const filePath = (0, path_1.join)(this.storeDir, this._getItemFileName(this.itemCount));
            return (0, fs_extra_1.writeFile)(filePath, finalItem);
        });
        await Promise.all(promises);
        this._updateTimestamps({ mtime: true });
    }
    /**
     * To emulate API and split arrays of items into individual dataset items,
     * we need to normalize the input items - which can be strings, objects
     * or arrays of those - into objects, so that we can save them one by one
     * later. We could potentially do this directly with strings, but let's
     * not optimize prematurely.
     */
    _normalizeItems(items) {
        if (typeof items === 'string') {
            items = JSON.parse(items);
        }
        return Array.isArray(items)
            ? items.map(this._normalizeItem)
            : [this._normalizeItem(items)];
    }
    _normalizeItem(item) {
        if (typeof item === 'string') {
            item = JSON.parse(item);
        }
        if (Array.isArray(item)) {
            throw new Error(`Each dataset item can only be a single JSON object, not an array. Received: [${item.join(',\n')}]`);
        }
        return item;
    }
    _ensureItemCount() {
        if (typeof this.itemCount === 'number')
            return;
        let files;
        try {
            files = (0, fs_extra_1.readdirSync)(this.storeDir);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                this._throw404();
            }
            else {
                throw err;
            }
        }
        if (files.length) {
            const lastFile = files.pop();
            const lastFileName = (0, path_1.parse)(lastFile).name;
            this.itemCount = Number(lastFileName);
        }
        else {
            this.itemCount = 0;
        }
    }
    _getItemFileName(index) {
        const name = index.toString().padStart(LOCAL_FILENAME_DIGITS, '0');
        return `${name}.json`;
    }
    _getStartAndEndIndexes(offset, limit = this.itemCount) {
        const start = offset + 1;
        const end = Math.min(offset + limit, this.itemCount) + 1;
        return [start, end];
    }
    async _readAndParseFile(index) {
        const filePath = (0, path_1.join)(this.storeDir, this._getItemFileName(index));
        const json = await (0, fs_extra_1.readFile)(filePath, 'utf8');
        return JSON.parse(json);
    }
    _throw404() {
        const err = new Error(`Dataset with id: ${this.name} does not exist.`);
        // TODO: cast as ErrorWithCode once #21 lands
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
exports.DatasetClient = DatasetClient;
//# sourceMappingURL=dataset.js.map