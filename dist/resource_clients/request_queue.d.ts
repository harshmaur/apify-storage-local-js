import type { DatabaseConnectionCache } from '../database_connection_cache';
import { BatchAddRequestsResult, RequestQueueInfo } from '../emulators/request_queue_emulator';
import type { QueueOperationInfo } from '../emulators/queue_operation_info';
export type AllowedHttpMethods = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'OPTIONS' | 'CONNECT' | 'PATCH';
export interface RequestBody {
    id?: string;
    url: string;
    uniqueKey: string;
    method?: AllowedHttpMethods;
    retryCount?: number;
    handledAt?: Date | string;
}
export interface RequestQueueHeadItem {
    id: string;
    retryCount: number;
    uniqueKey: string;
    url: string;
    method: AllowedHttpMethods;
}
export interface QueueHead {
    limit: number;
    queueModifiedAt: Date;
    hadMultipleClients: boolean;
    items: RequestQueueHeadItem[];
}
export interface ListAndLockHeadResult extends QueueHead {
    lockSecs: number;
}
export interface RequestModel {
    id?: string;
    queueId?: string;
    orderNo?: number | null;
    url: string;
    uniqueKey: string;
    method?: AllowedHttpMethods;
    retryCount?: number;
    handledAt?: Date | string;
    json?: string;
}
export interface RequestQueueClientOptions {
    name: string;
    storageDir: string;
    dbConnections: DatabaseConnectionCache;
}
export interface ListOptions {
    /**
     * @default 100
     */
    limit?: number;
}
export interface RequestOptions {
    forefront?: boolean;
}
export interface ProlongRequestLockOptions extends RequestOptions {
    lockSecs: number;
}
export interface ProlongRequestLockResult {
    lockExpiresAt: Date;
}
export interface ListAndLockOptions extends ListOptions {
    lockSecs: number;
}
export declare class RequestQueueClient {
    id: string;
    name: string;
    dbConnections: DatabaseConnectionCache;
    queueDir: string;
    private emulator;
    constructor({ dbConnections, name, storageDir }: RequestQueueClientOptions);
    /**
     * API client does not make any requests immediately after
     * creation so we simulate this by creating the emulator
     * lazily. The outcome is that an attempt to access a queue
     * that does not exist throws only at the access invocation,
     * which is in line with API client.
     */
    private _getEmulator;
    get(): Promise<RequestQueueInfo | undefined>;
    update(newFields: {
        name?: string;
    }): Promise<RequestQueueInfo | undefined>;
    delete(): Promise<void>;
    listHead(options?: ListOptions): Promise<QueueHead>;
    addRequest(request: RequestModel, options?: RequestOptions): Promise<QueueOperationInfo>;
    batchAddRequests(requests: RequestModel[], options?: RequestOptions): Promise<BatchAddRequestsResult>;
    getRequest(id: string): Promise<Record<string, unknown> | undefined>;
    updateRequest(request: RequestModel, options?: RequestOptions): Promise<QueueOperationInfo>;
    deleteRequest(_id: string): Promise<never>;
    prolongRequestLock(id: string, options: ProlongRequestLockOptions): Promise<ProlongRequestLockResult>;
    deleteRequestLock(id: string, options?: RequestOptions): Promise<void>;
    listAndLockHead(options: ListAndLockOptions): Promise<ListAndLockHeadResult>;
    private _createRequestModel;
    /**
     * A partial index on the requests table ensures
     * that NULL values are not returned when querying
     * for queue head.
     */
    private _calculateOrderNo;
    private _jsonToRequest;
}
//# sourceMappingURL=request_queue.d.ts.map