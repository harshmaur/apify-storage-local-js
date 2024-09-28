import type { DatabaseConnectionCache } from "../database_connection_cache";
import { RequestQueueInfo } from "../emulators/request_queue_emulator";
export interface RequestQueueCollectionClientOptions {
    storageDir: string;
    dbConnections: DatabaseConnectionCache;
}
export interface RequestQueueStats {
    readCount?: number;
    writeCount?: number;
    deleteCount?: number;
    headItemReadCount?: number;
    storageBytes?: number;
}
export interface RequestQueue {
    id: string;
    name?: string;
    title?: string;
    userId: string;
    createdAt: Date;
    modifiedAt: Date;
    accessedAt: Date;
    expireAt?: string;
    totalRequestCount: number;
    handledRequestCount: number;
    pendingRequestCount: number;
    actId?: string;
    actRunId?: string;
    hadMultipleClients: boolean;
    stats: RequestQueueStats;
}
export interface PaginatedList<Data> {
    /** Total count of entries in the dataset. */
    total: number;
    /** Count of dataset entries returned in this set. */
    count: number;
    /** Position of the first returned entry in the dataset. */
    offset: number;
    /** Maximum number of dataset entries requested. */
    limit: number;
    /** Should the results be in descending order. */
    desc: boolean;
    /** Dataset entries based on chosen format parameter. */
    items: Data[];
}
export type RequestQueueCollectionListResult = PaginatedList<RequestQueue & {
    username?: string;
}> & {
    unnamed: boolean;
};
/**
 * Request queue collection client.
 */
export declare class RequestQueueCollectionClient {
    storageDir: string;
    dbConnections: DatabaseConnectionCache;
    constructor({ storageDir, dbConnections, }: RequestQueueCollectionClientOptions);
    list(): Promise<RequestQueueCollectionListResult>;
    getOrCreate(name: string): Promise<RequestQueueInfo>;
}
//# sourceMappingURL=request_queue_collection.d.ts.map