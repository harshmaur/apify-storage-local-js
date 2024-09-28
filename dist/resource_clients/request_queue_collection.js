"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestQueueCollectionClient = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = require("fs-extra");
const ow_1 = tslib_1.__importDefault(require("ow"));
const path_1 = require("path");
const request_queue_emulator_1 = require("../emulators/request_queue_emulator");
const utils_1 = require("../utils");
/**
 * Request queue collection client.
 */
class RequestQueueCollectionClient {
    constructor({ storageDir, dbConnections, }) {
        Object.defineProperty(this, "storageDir", {
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
        this.storageDir = storageDir;
        this.dbConnections = dbConnections;
    }
    async list() {
        const emulator = new request_queue_emulator_1.RequestQueueEmulator({
            queueDir: this.storageDir,
            dbConnections: this.dbConnections,
        });
        const requests = emulator.selectRequestQueues();
        const items = requests.map((request) => {
            return {
                id: request.id,
                name: request.name,
                createdAt: new Date(request.createdAt),
                modifiedAt: new Date(request.modifiedAt),
                accessedAt: new Date(request.accessedAt),
                totalRequestCount: request.totalRequestCount,
                handledRequestCount: request.handledRequestCount,
                pendingRequestCount: request.pendingRequestCount,
                userId: "",
                hadMultipleClients: false,
                stats: {
                    readCount: 0,
                    writeCount: 0,
                    deleteCount: 0,
                    headItemReadCount: 0,
                    storageBytes: 0,
                },
            };
        });
        return {
            total: requests.length,
            count: requests.length,
            offset: 0,
            limit: 100,
            desc: true,
            items,
            unnamed: false,
        };
    }
    async getOrCreate(name) {
        (0, ow_1.default)(name, ow_1.default.string.nonEmpty);
        const queueDir = (0, path_1.join)(this.storageDir, name);
        await (0, fs_extra_1.ensureDir)(queueDir);
        const emulator = new request_queue_emulator_1.RequestQueueEmulator({
            queueDir,
            dbConnections: this.dbConnections,
        });
        const queue = emulator.selectOrInsertByName(name);
        return (0, utils_1.mapRawDataToRequestQueueInfo)(queue);
    }
}
exports.RequestQueueCollectionClient = RequestQueueCollectionClient;
//# sourceMappingURL=request_queue_collection.js.map