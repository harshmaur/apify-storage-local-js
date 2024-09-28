"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestQueueEmulator = void 0;
const path_1 = require("path");
const queue_operation_info_1 = require("./queue_operation_info");
const consts_1 = require("../consts");
const processed_request_1 = require("./batch_add_requests/processed_request");
const ERROR_REQUEST_NOT_UNIQUE = "SQLITE_CONSTRAINT_PRIMARYKEY";
const ERROR_QUEUE_DOES_NOT_EXIST = "SQLITE_CONSTRAINT_FOREIGNKEY";
class RequestQueueEmulator {
    constructor({ queueDir, dbConnections }) {
        Object.defineProperty(this, "dbPath", {
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
        Object.defineProperty(this, "db", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "queueTableName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "request_queues" /* STORAGE_NAMES.REQUEST_QUEUES */
        });
        Object.defineProperty(this, "requestsTableName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: `${"request_queues" /* STORAGE_NAMES.REQUEST_QUEUES */}_requests`
        });
        Object.defineProperty(this, "statements", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "transactions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.dbPath = (0, path_1.join)(queueDir, consts_1.DATABASE_FILE_NAME);
        this.dbConnections = dbConnections;
        try {
            this.db = dbConnections.openConnection(this.dbPath);
        }
        catch (err) {
            if (err.code !== "ENOENT")
                throw err;
            const newError = new Error(`Request queue with id: ${(0, path_1.parse)(queueDir).name} does not exist.`);
            newError.code = "ENOENT";
            throw newError;
        }
        // Everything's covered by IF NOT EXISTS so no need
        // to worry that multiple entities will be created.
        this._createTables();
        this._createTriggers();
        this._createIndexes();
        this._createStatements();
        this._createTransactions();
    }
    /**
     * Disconnects the emulator from the underlying database.
     */
    disconnect() {
        this.dbConnections.closeConnection(this.dbPath);
    }
    selectById(id) {
        return this.statements.selectById.get(id);
    }
    deleteById(id) {
        return this.statements.deleteById.run(id);
    }
    selectByName(name) {
        return this.statements.selectByName.get(name);
    }
    insertByName(name) {
        return this.statements.insertByName.run(name);
    }
    selectOrInsertByName(name) {
        return this.transactions.selectOrInsertByName(name);
    }
    selectModifiedAtById(id) {
        return this.statements.selectModifiedAtById.get(id);
    }
    updateNameById(id, name) {
        return this.statements.updateNameById.run({ id, name });
    }
    updateModifiedAtById(id) {
        return this.statements.updateModifiedAtById.run(id);
    }
    updateAccessedAtById(id) {
        return this.statements.updateAccessedAtById.run(id);
    }
    adjustTotalAndHandledRequestCounts(id, totalAdjustment, handledAdjustment) {
        return this.statements.adjustTotalAndHandledRequestCounts.run({
            id,
            totalAdjustment,
            handledAdjustment,
        });
    }
    selectRequestOrderNoByModel(requestModel) {
        return this.statements.selectRequestOrderNoByModel.get(requestModel);
    }
    selectRequestJsonByIdAndQueueId(requestId, queueId) {
        return this.statements.selectRequestJsonByModel.get({
            queueId,
            requestId,
        });
    }
    selectRequestQueues() {
        return this.statements.selectRequestQueues.all();
    }
    selectRequestJsonsByQueueIdWithLimit(queueId, limit) {
        return this.statements.selectRequestJsonsByQueueIdWithLimit.all({
            queueId,
            limit,
        });
    }
    insertRequestByModel(requestModel) {
        return this.statements.insertRequestByModel.run(requestModel);
    }
    updateRequestByModel(requestModel) {
        return this.statements.updateRequestByModel.run(requestModel);
    }
    deleteRequestById(id) {
        return this.statements.deleteById.run(id);
    }
    addRequest(requestModel) {
        return this.transactions.addRequest(requestModel);
    }
    batchAddRequests(requestModels) {
        return this.transactions.batchAddRequests(requestModels);
    }
    updateRequest(requestModel) {
        return this.transactions.updateRequest(requestModel);
    }
    deleteRequest(id) {
        return this.transactions.deleteRequest(id);
    }
    prolongRequestLock(id, options) {
        return this.transactions.prolongRequestLock(id, options);
    }
    deleteRequestLock(id, options) {
        return this.transactions.deleteRequestLock(id, options);
    }
    listAndLockHead(queueId, limit, lockSecs) {
        return this.transactions.listAndLockHead(queueId, limit, lockSecs);
    }
    updateOrderNo({ id, orderNo }) {
        this.statements.updateOrderNo.run({ id, orderNo });
    }
    _createTables() {
        this.db
            .prepare(`
            CREATE TABLE IF NOT EXISTS ${this.queueTableName}(
                id INTEGER PRIMARY KEY,
                name TEXT UNIQUE,
                createdAt TEXT DEFAULT(${consts_1.TIMESTAMP_SQL}),
                modifiedAt TEXT DEFAULT(${consts_1.TIMESTAMP_SQL}),
                accessedAt TEXT DEFAULT(${consts_1.TIMESTAMP_SQL}),
                totalRequestCount INTEGER DEFAULT 0,
                handledRequestCount INTEGER DEFAULT 0,
                pendingRequestCount INTEGER GENERATED ALWAYS AS (totalRequestCount - handledRequestCount) VIRTUAL
            )
        `)
            .run();
        this.db
            .prepare(`
            CREATE TABLE IF NOT EXISTS ${this.requestsTableName}(
                queueId INTEGER NOT NULL REFERENCES ${this.queueTableName}(id) ON DELETE CASCADE,
                id TEXT NOT NULL,
                orderNo INTEGER,
                url TEXT NOT NULL,
                uniqueKey TEXT NOT NULL,
                method TEXT,
                retryCount INTEGER,
                json TEXT NOT NULL,
                PRIMARY KEY (queueId, id, uniqueKey)
            )
        `)
            .run();
    }
    _createTriggers() {
        const getSqlForRequests = (cmd) => `
        CREATE TRIGGER IF NOT EXISTS T_bump_modifiedAt_accessedAt_on_${cmd.toLowerCase()}
                AFTER ${cmd} ON ${this.requestsTableName}
            BEGIN
                UPDATE ${this.queueTableName}
                SET modifiedAt = ${consts_1.TIMESTAMP_SQL},
                    accessedAt = ${consts_1.TIMESTAMP_SQL}
                WHERE id = ${cmd === "DELETE" ? "OLD" : "NEW"}.queueId;
            END
        `;
        ["INSERT", "UPDATE", "DELETE"].forEach((cmd) => {
            const sql = getSqlForRequests(cmd);
            this.db.exec(sql);
        });
    }
    _createIndexes() {
        this.db
            .prepare(`
            CREATE INDEX IF NOT EXISTS I_queueId_orderNo
            ON ${this.requestsTableName}(queueId, orderNo)
            WHERE orderNo IS NOT NULL
        `)
            .run();
    }
    _createStatements() {
        this.statements = {
            selectById: this.db.prepare(/* sql */ `
                SELECT *, CAST(id as TEXT) as id
                FROM ${this.queueTableName}
                WHERE id = ?
            `),
            deleteById: this.db.prepare(/* sql */ `
                DELETE FROM ${this.queueTableName}
                WHERE id = CAST(? as INTEGER)
            `),
            selectByName: this.db.prepare(/* sql */ `
                SELECT *, CAST(id as TEXT) as id
                FROM ${this.queueTableName}
                WHERE name = ?
            `),
            insertByName: this.db.prepare(/* sql */ `
                INSERT INTO ${this.queueTableName}(name)
                VALUES(?)
            `),
            selectModifiedAtById: this.db
                .prepare(
            /* sql */ `
                SELECT modifiedAt
                FROM ${this.queueTableName}
                WHERE id = ?
            `)
                .pluck(),
            updateNameById: this.db.prepare(/* sql */ `
                UPDATE ${this.queueTableName}
                SET name = :name
                WHERE id = CAST(:id as INTEGER)
            `),
            updateModifiedAtById: this.db.prepare(/* sql */ `
                UPDATE ${this.queueTableName}
                SET modifiedAt = ${consts_1.TIMESTAMP_SQL}
                WHERE id = CAST(? as INTEGER)
            `),
            updateAccessedAtById: this.db.prepare(/* sql */ `
                UPDATE ${this.queueTableName}
                SET accessedAt = ${consts_1.TIMESTAMP_SQL}
                WHERE id = CAST(? as INTEGER)
            `),
            adjustTotalAndHandledRequestCounts: this.db.prepare(/* sql */ `
                UPDATE ${this.queueTableName}
                SET totalRequestCount = totalRequestCount + :totalAdjustment,
                    handledRequestCount = handledRequestCount + :handledAdjustment
                WHERE id = CAST(:id as INTEGER)
            `),
            selectRequestOrderNoByModel: this.db
                .prepare(
            /* sql */ `
                SELECT orderNo FROM ${this.requestsTableName}
                WHERE queueId = CAST(:queueId as INTEGER) AND id = :id
            `)
                .pluck(),
            selectRequestQueues: this.db.prepare(/* sql */ `
                SELECT * FROM ${this.queueTableName}
            `),
            selectRequestJsonByModel: this.db
                .prepare(
            /* sql */ `
                SELECT "json" FROM ${this.requestsTableName}
                WHERE queueId = CAST(:queueId as INTEGER) AND id = :requestId
            `)
                .pluck(),
            selectRequestJsonsByQueueIdWithLimit: this.db
                .prepare(
            /* sql */ `
                SELECT "json" FROM ${this.requestsTableName}
                WHERE queueId = CAST(:queueId as INTEGER) AND orderNo IS NOT NULL
                LIMIT :limit
            `)
                .pluck(),
            insertRequestByModel: this.db.prepare(/* sql */ `
                INSERT INTO ${this.requestsTableName}(
                    id, queueId, orderNo, url, uniqueKey, method, retryCount, json
                ) VALUES (
                    :id, CAST(:queueId as INTEGER), :orderNo, :url, :uniqueKey, :method, :retryCount, :json
                )
            `),
            updateRequestByModel: this.db.prepare(/* sql */ `
                UPDATE ${this.requestsTableName}
                SET orderNo = :orderNo,
                    url = :url,
                    uniqueKey = :uniqueKey,
                    method = :method,
                    retryCount = :retryCount,
                    json = :json
                WHERE queueId = CAST(:queueId as INTEGER) AND id = :id
            `),
            deleteRequestById: this.db.prepare(/* sql */ `
                DELETE FROM ${this.requestsTableName}
                WHERE id = ?
            `),
            fetchRequestNotExpired: this.db.prepare(/* sql */ `
                SELECT id, orderNo FROM ${this.requestsTableName}
                WHERE id = ?
                AND orderNo IS NOT NULL
            `),
            fetchRequestNotExpiredAndLocked: this.db.prepare(/* sql */ `
                SELECT id FROM ${this.requestsTableName}
                WHERE id = :id
                AND orderNo IS NOT NULL
                AND (
                    orderNo > :currentTime
                    OR orderNo < -(:currentTime)
                )
            `),
            fetchRequestHeadThatWillBeLocked: this.db.prepare(/* sql */ `
                SELECT id, "json", orderNo FROM ${this.requestsTableName}
                WHERE queueId = CAST(:queueId as INTEGER)
                AND orderNo IS NOT NULL
                AND orderNo <= :currentTime
                AND orderNo >= -(:currentTime)
                ORDER BY orderNo ASC
                LIMIT :limit
            `),
            updateOrderNo: this.db.prepare(/* sql */ `
                UPDATE ${this.requestsTableName}
                SET orderNo = :orderNo
                WHERE id = :id
            `),
        };
    }
    _createTransactions() {
        this.transactions = {
            selectOrInsertByName: this.db.transaction((name) => {
                if (name) {
                    const storage = this.selectByName(name);
                    if (storage)
                        return storage;
                }
                const { lastInsertRowid } = this.insertByName(name);
                return this.selectById(lastInsertRowid.toString());
            }),
            addRequest: this.db.transaction((model) => {
                try {
                    this.insertRequestByModel(model);
                    const handledCountAdjustment = model.orderNo === null ? 1 : 0;
                    this.adjustTotalAndHandledRequestCounts(model.queueId, 1, handledCountAdjustment);
                    // We return wasAlreadyHandled: false even though the request may
                    // have been added as handled, because that's how API behaves.
                    return new queue_operation_info_1.QueueOperationInfo(model.id);
                }
                catch (err) {
                    if (err.code === ERROR_REQUEST_NOT_UNIQUE) {
                        // If we got here it means that the request was already present.
                        // We need to figure out if it were handled too.
                        const orderNo = this.selectRequestOrderNoByModel(model);
                        return new queue_operation_info_1.QueueOperationInfo(model.id, orderNo);
                    }
                    if (err.code === ERROR_QUEUE_DOES_NOT_EXIST) {
                        throw new Error(`Request queue with id: ${model.queueId} does not exist.`);
                    }
                    throw err;
                }
            }),
            batchAddRequests: this.db.transaction((models) => {
                const result = {
                    processedRequests: [],
                    unprocessedRequests: [],
                };
                for (const model of models) {
                    try {
                        this.insertRequestByModel(model);
                        const handledCountAdjustment = model.orderNo == null ? 1 : 0;
                        this.adjustTotalAndHandledRequestCounts(model.queueId, 1, handledCountAdjustment);
                        // We return wasAlreadyHandled: false even though the request may
                        // have been added as handled, because that's how API behaves.
                        result.processedRequests.push(new processed_request_1.ProcessedRequest(model.id, model.uniqueKey));
                    }
                    catch (err) {
                        if (err.code === ERROR_REQUEST_NOT_UNIQUE) {
                            const orderNo = this.selectRequestOrderNoByModel(model);
                            // If we got here it means that the request was already present.
                            result.processedRequests.push(new processed_request_1.ProcessedRequest(model.id, model.uniqueKey, orderNo));
                        }
                        else if (err.code === ERROR_QUEUE_DOES_NOT_EXIST) {
                            throw new Error(`Request queue with id: ${model.queueId} does not exist.`);
                        }
                        else {
                            throw err;
                        }
                    }
                }
                return result;
            }),
            updateRequest: this.db.transaction((model) => {
                // First we need to check the existing request to be
                // able to return information about its handled state.
                const orderNo = this.selectRequestOrderNoByModel(model);
                // Undefined means that the request is not present in the queue.
                // We need to insert it, to behave the same as API.
                if (orderNo === undefined) {
                    return this.addRequest(model);
                }
                // When updating the request, we need to make sure that
                // the handled counts are updated correctly in all cases.
                this.updateRequestByModel(model);
                let handledCountAdjustment = 0;
                const isRequestHandledStateChanging = typeof orderNo !== typeof model.orderNo;
                const requestWasHandledBeforeUpdate = orderNo === null;
                if (isRequestHandledStateChanging)
                    handledCountAdjustment += 1;
                if (requestWasHandledBeforeUpdate)
                    handledCountAdjustment = -handledCountAdjustment;
                this.adjustTotalAndHandledRequestCounts(model.queueId, 0, handledCountAdjustment);
                // Again, it's important to return the state of the previous
                // request, not the new one, because that's how API does it.
                return new queue_operation_info_1.QueueOperationInfo(model.id, orderNo);
            }),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            deleteRequest: this.db.transaction((_id) => {
                // TODO
            }),
            prolongRequestLock: this.db.transaction((id, options) => {
                const existingRequest = this.statements.fetchRequestNotExpired.get(id);
                if (!existingRequest) {
                    throw new Error(`Request with ID ${id} was already handled or doesn't exist`);
                }
                const unlockTimestamp = Math.abs(existingRequest.orderNo) + options.lockSecs * 1000;
                const newOrderNo = options.forefront
                    ? -unlockTimestamp
                    : unlockTimestamp;
                this.updateOrderNo({ id, orderNo: newOrderNo });
                return new Date(unlockTimestamp);
            }),
            deleteRequestLock: this.db.transaction((id, { forefront }) => {
                const timestamp = Date.now();
                const existingRequest = this.statements.fetchRequestNotExpiredAndLocked.get({
                    id,
                    currentTime: timestamp,
                });
                if (!existingRequest) {
                    throw new Error(`Request with ID ${id} was already handled, doesn't exist, or is not locked`);
                }
                this.updateOrderNo({
                    id,
                    orderNo: forefront ? -timestamp : timestamp,
                });
            }),
            listAndLockHead: this.db.transaction((queueId, limit, lockSecs) => {
                const timestamp = Date.now();
                const requestsToLock = this.statements.fetchRequestHeadThatWillBeLocked.all({
                    queueId,
                    currentTime: timestamp,
                    limit,
                });
                if (!requestsToLock.length) {
                    return [];
                }
                for (const { id, orderNo } of requestsToLock) {
                    const newOrderNo = (timestamp + lockSecs * 1000) * (orderNo > 0 ? 1 : -1);
                    this.updateOrderNo({ id, orderNo: newOrderNo });
                }
                return requestsToLock.map(({ json }) => json);
            }),
        };
    }
}
exports.RequestQueueEmulator = RequestQueueEmulator;
//# sourceMappingURL=request_queue_emulator.js.map