import { DatabaseConnectionCache } from './database_connection_cache';
import { DatasetClient } from './resource_clients/dataset';
import { DatasetCollectionClient } from './resource_clients/dataset_collection';
import { KeyValueStoreClient } from './resource_clients/key_value_store';
import { KeyValueStoreCollectionClient } from './resource_clients/key_value_store_collection';
import { RequestQueueClient } from './resource_clients/request_queue';
import { RequestQueueCollectionClient } from './resource_clients/request_queue_collection';
export interface ApifyStorageLocalOptions {
    /**
     * Path to directory with storages. If there are no storages yet,
     * appropriate sub-directories will be created in this directory.
     * @default './apify_storage'
     */
    storageDir?: string;
    /**
     * SQLite WAL mode (instead of a rollback journal) is used by default for request queues, however, in some file systems it could behave weirdly.
     * Setting this property to `false` will force the request queue database to use a rollback journal instead of WAL.
     * @default true
     */
    enableWalMode?: boolean;
}
export interface RequestQueueOptions {
    clientKey?: string;
    timeoutSecs?: number;
}
/**
 * Represents local emulation of [Apify Storage](https://apify.com/storage).
 */
export declare class ApifyStorageLocal {
    readonly storageDir: string;
    readonly requestQueueDir: string;
    readonly keyValueStoreDir: string;
    readonly datasetDir: string;
    readonly dbConnections: DatabaseConnectionCache;
    readonly enableWalMode: boolean;
    /**
     * DatasetClient keeps internal state: itemCount
     * We need to keep a single client instance not to
     * have different numbers across parallel clients.
     */
    readonly datasetClientCache: Map<string, DatasetClient>;
    private isRequestQueueDirInitialized;
    private isKeyValueStoreDirInitialized;
    private isDatasetDirInitialized;
    constructor(options?: ApifyStorageLocalOptions);
    datasets(): DatasetCollectionClient;
    dataset(id: string): DatasetClient;
    keyValueStores(): KeyValueStoreCollectionClient;
    keyValueStore(id: string): KeyValueStoreClient;
    requestQueues(): RequestQueueCollectionClient;
    requestQueue(id: string, options?: RequestQueueOptions): RequestQueueClient;
    /**
     * Cleans up the default local storage directories before the run starts:
     *  - local directory containing the default dataset;
     *  - all records from the default key-value store in the local directory, except for the "INPUT" key;
     *  - local directory containing the default request queue.
     */
    purge(): Promise<void>;
    private removeFiles;
    private _ensureDatasetDir;
    private _ensureKeyValueStoreDir;
    private _ensureRequestQueueDir;
    private _checkIfStorageIsEmpty;
}
//# sourceMappingURL=index.d.ts.map