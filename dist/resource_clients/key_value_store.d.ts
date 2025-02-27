export interface KeyValueStoreRecord {
    key: string;
    value: any;
    contentType?: string;
}
export interface KeyValueStoreClientOptions {
    name: string;
    storageDir: string;
}
export interface KeyValueStoreData {
    id: string;
    name: string;
    createdAt: Date;
    modifiedAt: Date;
    accessedAt: Date;
}
export interface KeyValueStoreClientUpdateOptions {
    name?: string;
}
export interface KeyValueStoreClientListOptions {
    limit?: number;
    exclusiveStartKey?: string;
}
export interface KeyValueStoreItemData {
    key: string;
    size: number;
}
export interface KeyValueStoreClientListData {
    count: number;
    limit: number;
    exclusiveStartKey?: string;
    isTruncated: boolean;
    nextExclusiveStartKey?: string;
    items: KeyValueStoreItemData[];
}
export interface KeyValueStoreClientGetRecordOptions {
    buffer?: boolean;
    stream?: boolean;
}
/**
 * Key-value Store client.
 */
export declare class KeyValueStoreClient {
    name: string;
    storeDir: string;
    constructor({ name, storageDir }: KeyValueStoreClientOptions);
    get(): Promise<KeyValueStoreData | undefined>;
    update(newFields: KeyValueStoreClientUpdateOptions): Promise<Record<string, unknown>>;
    delete(): Promise<void>;
    listKeys(options?: KeyValueStoreClientListOptions): Promise<KeyValueStoreClientListData>;
    /**
     * Tests whether a record with the given key exists in the key-value store without retrieving its value.
     * @param key The queried record key.
     * @returns `true` if the record exists, `false` otherwise.
     */
    recordExists(key: string): Promise<boolean>;
    getRecord(key: string, options?: KeyValueStoreClientGetRecordOptions): Promise<KeyValueStoreRecord | undefined>;
    setRecord(record: KeyValueStoreRecord): Promise<void>;
    deleteRecord(key: string): Promise<void>;
    /**
     * Helper function to resolve file paths.
     * @private
     */
    private _resolvePath;
    /**
     * Helper function to handle files. Accepts a promisified 'fs' function as a second parameter
     * which will be executed against the file saved under the key. Since the file's extension and thus
     * full path is not known, it first performs a check against common extensions. If no file is found,
     * it will read a full list of files in the directory and attempt to find the file again.
     *
     * Returns an object when a file is found and handler executes successfully, undefined otherwise.
     * @private
     */
    private _handleFile;
    private _invokeHandler;
    /**
     * Performs a lookup for a file in the local emulation directory's file list.
     * @private
     */
    private _findFileNameByKey;
    private _throw404;
    private _updateTimestamps;
}
//# sourceMappingURL=key_value_store.d.ts.map