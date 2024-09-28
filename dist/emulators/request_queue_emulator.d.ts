import type { Database, RunResult } from "better-sqlite3";
import { QueueOperationInfo } from "./queue_operation_info";
import { STORAGE_NAMES } from "../consts";
import type { DatabaseConnectionCache } from "../database_connection_cache";
import type { ProlongRequestLockOptions, RequestModel, RequestOptions } from "../resource_clients/request_queue";
import { ProcessedRequest } from "./batch_add_requests/processed_request";
import { UnprocessedRequest } from "./batch_add_requests/unprocessed_request";
export interface RequestQueueEmulatorOptions {
    queueDir: string;
    dbConnections: DatabaseConnectionCache;
}
export interface RawQueueTableData {
    id: string;
    name: string;
    createdAt: string;
    modifiedAt: string;
    accessedAt: string;
    totalRequestCount: number;
    handledRequestCount: number;
    pendingRequestCount: number;
}
export interface RequestQueueInfo {
    id: string;
    name: string;
    createdAt: Date;
    modifiedAt: Date;
    accessedAt: Date;
    totalRequestCount: number;
    handledRequestCount: number;
    pendingRequestCount: number;
}
export interface RawRequestsTableData {
    queueId: string;
    id: string;
    orderNo: number;
    url: string;
    uniqueKey: string;
    method?: string | null;
    retryCount: number;
    json: string;
}
export declare class RequestQueueEmulator {
    dbPath: string;
    dbConnections: DatabaseConnectionCache;
    db: Database;
    queueTableName: STORAGE_NAMES;
    requestsTableName: string;
    private statements;
    private transactions;
    constructor({ queueDir, dbConnections }: RequestQueueEmulatorOptions);
    /**
     * Disconnects the emulator from the underlying database.
     */
    disconnect(): void;
    selectById(id: string | number): RawQueueTableData;
    deleteById(id: string): RunResult;
    selectByName(name: string): RawQueueTableData;
    insertByName(name: string): RunResult;
    selectOrInsertByName(name: string): RawQueueTableData;
    selectModifiedAtById(id: string | number): string;
    updateNameById(id: string | number, name: string): RunResult;
    updateModifiedAtById(id: string | number): RunResult;
    updateAccessedAtById(id: string | number): RunResult;
    adjustTotalAndHandledRequestCounts(id: string, totalAdjustment: number, handledAdjustment: number): RunResult;
    selectRequestOrderNoByModel(requestModel: RequestModel): number | null;
    selectRequestJsonByIdAndQueueId(requestId: string, queueId: string): string;
    selectRequestQueues(): RawQueueTableData[];
    selectRequestJsonsByQueueIdWithLimit(queueId: string, limit: number): string[];
    insertRequestByModel(requestModel: RequestModel): RunResult;
    updateRequestByModel(requestModel: RequestModel): RunResult;
    deleteRequestById(id: string): RunResult;
    addRequest(requestModel: RequestModel): QueueOperationInfo;
    batchAddRequests(requestModels: RequestModel[]): BatchAddRequestsResult;
    updateRequest(requestModel: RequestModel): QueueOperationInfo;
    deleteRequest(id: string): unknown;
    prolongRequestLock(id: string, options: ProlongRequestLockOptions): Date;
    deleteRequestLock(id: string, options: RequestOptions): void;
    listAndLockHead(queueId: string, limit: number, lockSecs: number): string[];
    private updateOrderNo;
    private _createTables;
    private _createTriggers;
    private _createIndexes;
    private _createStatements;
    private _createTransactions;
}
export interface BatchAddRequestsResult {
    processedRequests: ProcessedRequest[];
    unprocessedRequests: UnprocessedRequest[];
}
//# sourceMappingURL=request_queue_emulator.d.ts.map