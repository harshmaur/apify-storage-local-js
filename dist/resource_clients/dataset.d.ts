import type { DatasetCollectionData } from './dataset_collection';
export interface DatasetClientOptions {
    name: string;
    storageDir: string;
}
export interface Dataset extends DatasetCollectionData {
    itemCount: number;
}
type DataTypes = string | string[] | Record<string, unknown> | Record<string, unknown>[];
export interface DatasetClientUpdateOptions {
    name?: string;
}
export interface DatasetClientListOptions {
    desc?: boolean;
    limit?: number;
    offset?: number;
}
export interface PaginationList {
    items: Record<string, unknown>[];
    total: number;
    offset: number;
    count: number;
    limit: number;
    desc?: boolean;
}
export declare class DatasetClient {
    name: string;
    storeDir: string;
    itemCount?: number;
    constructor({ name, storageDir }: DatasetClientOptions);
    get(): Promise<Dataset | undefined>;
    update(newFields: DatasetClientUpdateOptions): Promise<Record<string, unknown>>;
    delete(): Promise<void>;
    downloadItems(): Promise<never>;
    listItems(options?: DatasetClientListOptions): Promise<PaginationList>;
    pushItems(items: DataTypes): Promise<void>;
    /**
     * To emulate API and split arrays of items into individual dataset items,
     * we need to normalize the input items - which can be strings, objects
     * or arrays of those - into objects, so that we can save them one by one
     * later. We could potentially do this directly with strings, but let's
     * not optimize prematurely.
     */
    private _normalizeItems;
    private _normalizeItem;
    private _ensureItemCount;
    private _getItemFileName;
    private _getStartAndEndIndexes;
    private _readAndParseFile;
    private _throw404;
    private _updateTimestamps;
}
export {};
//# sourceMappingURL=dataset.d.ts.map