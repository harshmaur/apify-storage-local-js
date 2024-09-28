import { ensureDir } from "fs-extra";
import ow from "ow";
import { join } from "path";
import type { DatabaseConnectionCache } from "../database_connection_cache";
import {
    RequestQueueEmulator,
    RequestQueueInfo,
} from "../emulators/request_queue_emulator";
import { mapRawDataToRequestQueueInfo } from "../utils";

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

export type RequestQueueCollectionListResult = PaginatedList<
    RequestQueue & {
        username?: string;
    }
> & {
    unnamed: boolean;
};
/**
 * Request queue collection client.
 */
export class RequestQueueCollectionClient {
    storageDir: string;

    dbConnections: DatabaseConnectionCache;

    constructor({
        storageDir,
        dbConnections,
    }: RequestQueueCollectionClientOptions) {
        this.storageDir = storageDir;
        this.dbConnections = dbConnections;
    }

    async list(): Promise<RequestQueueCollectionListResult> {
        const emulator = new RequestQueueEmulator({
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

    async getOrCreate(name: string): Promise<RequestQueueInfo> {
        ow(name, ow.string.nonEmpty);
        const queueDir = join(this.storageDir, name);
        await ensureDir(queueDir);
        const emulator = new RequestQueueEmulator({
            queueDir,
            dbConnections: this.dbConnections,
        });
        const queue = emulator.selectOrInsertByName(name);

        return mapRawDataToRequestQueueInfo(queue)!;
    }
}
