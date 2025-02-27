"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestQueueClient = void 0;
const tslib_1 = require("tslib");
const path_1 = require("path");
const ow_1 = tslib_1.__importDefault(require("ow"));
const fs_extra_1 = require("fs-extra");
const request_queue_emulator_1 = require("../emulators/request_queue_emulator");
const utils_1 = require("../utils");
const requestShape = {
    url: ow_1.default.string,
    uniqueKey: ow_1.default.string,
    method: ow_1.default.optional.string,
    retryCount: ow_1.default.optional.number,
    handledAt: ow_1.default.optional.any(ow_1.default.string.date, ow_1.default.date),
};
class RequestQueueClient {
    constructor({ dbConnections, name, storageDir }) {
        // Since queues are represented by folders,
        // each DB only has one queue with ID 1.
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: '1'
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "dbConnections", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "queueDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "emulator", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = name;
        this.dbConnections = dbConnections;
        this.queueDir = (0, path_1.join)(storageDir, name);
    }
    /**
     * API client does not make any requests immediately after
     * creation so we simulate this by creating the emulator
     * lazily. The outcome is that an attempt to access a queue
     * that does not exist throws only at the access invocation,
     * which is in line with API client.
     */
    _getEmulator() {
        if (!this.emulator) {
            this.emulator = new request_queue_emulator_1.RequestQueueEmulator({
                queueDir: this.queueDir,
                dbConnections: this.dbConnections,
            });
        }
        return this.emulator;
    }
    async get() {
        let queue;
        try {
            this._getEmulator().updateAccessedAtById(this.id);
            queue = this._getEmulator().selectById(this.id);
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
        }
        if (queue) {
            return (0, utils_1.mapRawDataToRequestQueueInfo)(queue);
        }
        return undefined;
    }
    async update(newFields) {
        // The validation is intentionally loose to prevent issues
        // when swapping to a remote queue in production.
        (0, ow_1.default)(newFields, ow_1.default.object.partialShape({
            name: ow_1.default.optional.string.nonEmpty,
        }));
        if (!newFields.name)
            return;
        const newPath = (0, path_1.join)((0, path_1.dirname)(this.queueDir), newFields.name);
        // To prevent chaos, we close the database connection before moving the folder.
        this._getEmulator().disconnect();
        try {
            await (0, fs_extra_1.move)(this.queueDir, newPath);
        }
        catch (err) {
            if (/dest already exists/.test(err.message)) {
                throw new Error('Request queue name is not unique.');
            }
            throw err;
        }
        this.name = newFields.name;
        this._getEmulator().updateNameById(this.id, newFields.name);
        this._getEmulator().updateModifiedAtById(this.id);
        const queue = this._getEmulator().selectById(this.id);
        return (0, utils_1.mapRawDataToRequestQueueInfo)(queue);
    }
    async delete() {
        this._getEmulator().disconnect();
        await (0, fs_extra_1.remove)(this.queueDir);
    }
    async listHead(options = {}) {
        (0, ow_1.default)(options, ow_1.default.object.exactShape({
            limit: ow_1.default.optional.number,
        }));
        const { limit = 100, } = options;
        this._getEmulator().updateAccessedAtById(this.id);
        const requestJsons = this._getEmulator().selectRequestJsonsByQueueIdWithLimit(this.id, limit);
        const queueModifiedAt = new Date(this._getEmulator().selectModifiedAtById(this.id));
        return {
            limit,
            queueModifiedAt,
            hadMultipleClients: false,
            items: requestJsons.map((json) => this._jsonToRequest(json)),
        };
    }
    async addRequest(request, options = {}) {
        (0, ow_1.default)(request, ow_1.default.object.partialShape({
            id: ow_1.default.undefined,
            ...requestShape,
        }));
        (0, ow_1.default)(options, ow_1.default.object.exactShape({
            forefront: ow_1.default.optional.boolean,
        }));
        const requestModel = this._createRequestModel(request, options.forefront);
        return this._getEmulator().addRequest(requestModel);
    }
    async batchAddRequests(requests, options = {}) {
        (0, ow_1.default)(requests, ow_1.default.array.ofType(ow_1.default.object.partialShape({
            id: ow_1.default.undefined,
            ...requestShape,
        })));
        (0, ow_1.default)(options, ow_1.default.object.exactShape({
            forefront: ow_1.default.optional.boolean,
        }));
        const requestModels = requests.map((request) => this._createRequestModel(request, options.forefront));
        return this._getEmulator().batchAddRequests(requestModels);
    }
    async getRequest(id) {
        (0, ow_1.default)(id, ow_1.default.string);
        this._getEmulator().updateAccessedAtById(this.id);
        const json = this._getEmulator().selectRequestJsonByIdAndQueueId(id, this.id);
        return this._jsonToRequest(json);
    }
    async updateRequest(request, options = {}) {
        (0, ow_1.default)(request, ow_1.default.object.partialShape({
            id: ow_1.default.string,
            ...requestShape,
        }));
        (0, ow_1.default)(options, ow_1.default.object.exactShape({
            forefront: ow_1.default.optional.boolean,
        }));
        const requestModel = this._createRequestModel(request, options.forefront);
        return this._getEmulator().updateRequest(requestModel);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async deleteRequest(_id) {
        // TODO Deletion is done, but we also need to update request counts in a transaction.
        throw new Error('This method is not implemented in @apify/storage-local yet.');
    }
    async prolongRequestLock(id, options) {
        (0, ow_1.default)(id, ow_1.default.string);
        (0, ow_1.default)(options, ow_1.default.object.exactShape({
            lockSecs: ow_1.default.number,
            forefront: ow_1.default.optional.boolean,
        }));
        this._getEmulator().updateAccessedAtById(this.id);
        const lockExpiresAt = this._getEmulator().prolongRequestLock(id, options);
        return { lockExpiresAt };
    }
    async deleteRequestLock(id, options = {}) {
        (0, ow_1.default)(id, ow_1.default.string);
        (0, ow_1.default)(options, ow_1.default.object.exactShape({
            forefront: ow_1.default.optional.boolean,
        }));
        this._getEmulator().updateAccessedAtById(this.id);
        this._getEmulator().deleteRequestLock(id, options);
    }
    async listAndLockHead(options) {
        (0, ow_1.default)(options, ow_1.default.object.exactShape({
            limit: ow_1.default.optional.number.lessThanOrEqual(25),
            lockSecs: ow_1.default.number,
        }));
        const { limit = 25, lockSecs, } = options;
        this._getEmulator().updateAccessedAtById(this.id);
        const requestJsons = this._getEmulator().listAndLockHead(this.id, limit, lockSecs);
        const queueModifiedAt = new Date(this._getEmulator().selectModifiedAtById(this.id));
        return {
            limit,
            queueModifiedAt,
            hadMultipleClients: false,
            items: requestJsons.map((json) => this._jsonToRequest(json)),
            lockSecs,
        };
    }
    _createRequestModel(request, forefront) {
        const orderNo = this._calculateOrderNo(request, forefront);
        const id = (0, utils_1.uniqueKeyToRequestId)(request.uniqueKey);
        if (request.id && id !== request.id)
            throw new Error('Request ID does not match its uniqueKey.');
        const json = JSON.stringify({ ...request, id });
        return {
            id,
            queueId: this.id,
            orderNo,
            url: request.url,
            uniqueKey: request.uniqueKey,
            method: request.method,
            retryCount: request.retryCount,
            json,
        };
    }
    /**
     * A partial index on the requests table ensures
     * that NULL values are not returned when querying
     * for queue head.
     */
    _calculateOrderNo(request, forefront) {
        if (request.handledAt)
            return null;
        const timestamp = Date.now();
        return forefront ? -timestamp : timestamp;
    }
    _jsonToRequest(requestJson) {
        if (!requestJson)
            return;
        const request = JSON.parse(requestJson);
        return (0, utils_1.purgeNullsFromObject)(request);
    }
}
exports.RequestQueueClient = RequestQueueClient;
//# sourceMappingURL=request_queue.js.map