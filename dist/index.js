"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApifyStorageLocal = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = require("fs-extra");
const ow_1 = tslib_1.__importDefault(require("ow"));
const promises_1 = require("fs/promises");
const path_1 = require("path");
const log_1 = tslib_1.__importDefault(require("@apify/log"));
const consts_1 = require("@apify/consts");
const database_connection_cache_1 = require("./database_connection_cache");
const dataset_1 = require("./resource_clients/dataset");
const dataset_collection_1 = require("./resource_clients/dataset_collection");
const key_value_store_1 = require("./resource_clients/key_value_store");
const key_value_store_collection_1 = require("./resource_clients/key_value_store_collection");
const request_queue_1 = require("./resource_clients/request_queue");
const request_queue_collection_1 = require("./resource_clients/request_queue_collection");
// Singleton cache to be shared across all ApifyStorageLocal instances
// to make sure that multiple connections are not created to the same database.
const databaseConnectionCache = new database_connection_cache_1.DatabaseConnectionCache();
/**
 * Represents local emulation of [Apify Storage](https://apify.com/storage).
 */
class ApifyStorageLocal {
    constructor(options = {}) {
        var _a, _b, _c, _d;
        Object.defineProperty(this, "storageDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "requestQueueDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "keyValueStoreDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "datasetDir", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "dbConnections", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: databaseConnectionCache
        });
        Object.defineProperty(this, "enableWalMode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * DatasetClient keeps internal state: itemCount
         * We need to keep a single client instance not to
         * have different numbers across parallel clients.
         */
        Object.defineProperty(this, "datasetClientCache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        // To prevent directories from being created immediately when
        // an ApifyClient instance is constructed, we create them lazily.
        Object.defineProperty(this, "isRequestQueueDirInitialized", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "isKeyValueStoreDirInitialized", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "isDatasetDirInitialized", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        (0, ow_1.default)(options, 'ApifyStorageLocalOptions', ow_1.default.optional.object.exactShape({
            storageDir: ow_1.default.optional.string,
            enableWalMode: ow_1.default.optional.boolean,
        }));
        /**
         * Returns the first argument which is not `undefined`.
         * If all the arguments are `undefined`, returns `undefined` (but the type is `never`).
         */
        const bool = (val) => (val == null ? val : !['false', '0', ''].includes(val.toLowerCase()));
        const storageDir = (_b = (_a = process.env.APIFY_LOCAL_STORAGE_DIR) !== null && _a !== void 0 ? _a : options.storageDir) !== null && _b !== void 0 ? _b : './apify_storage';
        const enableWalMode = (_d = (_c = bool(process.env.APIFY_LOCAL_STORAGE_ENABLE_WAL_MODE)) !== null && _c !== void 0 ? _c : options.enableWalMode) !== null && _d !== void 0 ? _d : true;
        if (!(0, fs_extra_1.pathExistsSync)(storageDir)) {
            log_1.default.info(`Created a data storage folder at ${storageDir}. You can override the path by setting the APIFY_LOCAL_STORAGE_DIR environment variable`);
            (0, fs_extra_1.ensureDirSync)(storageDir);
        }
        this.storageDir = storageDir;
        this.requestQueueDir = (0, path_1.resolve)(storageDir, "request_queues" /* STORAGE_NAMES.REQUEST_QUEUES */);
        this.keyValueStoreDir = (0, path_1.resolve)(storageDir, "key_value_stores" /* STORAGE_NAMES.KEY_VALUE_STORES */);
        this.datasetDir = (0, path_1.resolve)(storageDir, "datasets" /* STORAGE_NAMES.DATASETS */);
        this.enableWalMode = enableWalMode;
        this.dbConnections.setWalMode(this.enableWalMode);
    }
    datasets() {
        this._ensureDatasetDir();
        return new dataset_collection_1.DatasetCollectionClient({
            storageDir: this.datasetDir,
        });
    }
    dataset(id) {
        (0, ow_1.default)(id, ow_1.default.string);
        this._ensureDatasetDir();
        let client = this.datasetClientCache.get(id);
        if (!client) {
            client = new dataset_1.DatasetClient({
                name: id,
                storageDir: this.datasetDir,
            });
            this.datasetClientCache.set(id, client);
        }
        return client;
    }
    keyValueStores() {
        this._ensureKeyValueStoreDir();
        return new key_value_store_collection_1.KeyValueStoreCollectionClient({
            storageDir: this.keyValueStoreDir,
        });
    }
    keyValueStore(id) {
        (0, ow_1.default)(id, ow_1.default.string);
        this._ensureKeyValueStoreDir();
        return new key_value_store_1.KeyValueStoreClient({
            name: id,
            storageDir: this.keyValueStoreDir,
        });
    }
    requestQueues() {
        this._ensureRequestQueueDir();
        return new request_queue_collection_1.RequestQueueCollectionClient({
            storageDir: this.requestQueueDir,
            dbConnections: this.dbConnections,
        });
    }
    requestQueue(id, options = {}) {
        (0, ow_1.default)(id, ow_1.default.string);
        // Matching the Client validation.
        (0, ow_1.default)(options, ow_1.default.object.exactShape({
            clientKey: ow_1.default.optional.string,
            timeoutSecs: ow_1.default.optional.number,
        }));
        this._ensureRequestQueueDir();
        return new request_queue_1.RequestQueueClient({
            name: id,
            storageDir: this.requestQueueDir,
            dbConnections: this.dbConnections,
        });
    }
    /**
     * Cleans up the default local storage directories before the run starts:
     *  - local directory containing the default dataset;
     *  - all records from the default key-value store in the local directory, except for the "INPUT" key;
     *  - local directory containing the default request queue.
     */
    async purge() {
        const defaultDatasetPath = (0, path_1.resolve)(this.datasetDir, consts_1.LOCAL_ENV_VARS[consts_1.ENV_VARS.DEFAULT_DATASET_ID]);
        await this.removeFiles(defaultDatasetPath);
        const defaultKeyValueStorePath = (0, path_1.resolve)(this.keyValueStoreDir, consts_1.LOCAL_ENV_VARS[consts_1.ENV_VARS.DEFAULT_KEY_VALUE_STORE_ID]);
        await this.removeFiles(defaultKeyValueStorePath);
        const defaultRequestQueuePath = (0, path_1.resolve)(this.requestQueueDir, consts_1.LOCAL_ENV_VARS[consts_1.ENV_VARS.DEFAULT_REQUEST_QUEUE_ID]);
        await this.removeFiles(defaultRequestQueuePath);
    }
    async removeFiles(folder) {
        const storagePathExists = await (0, fs_extra_1.pathExists)(folder);
        if (storagePathExists) {
            const direntNames = await (0, promises_1.readdir)(folder);
            const deletePromises = [];
            for (const direntName of direntNames) {
                const fileName = (0, path_1.join)(folder, direntName);
                if (!new RegExp(consts_1.KEY_VALUE_STORE_KEYS.INPUT).test(fileName)) {
                    deletePromises.push((0, promises_1.rm)(fileName, { recursive: true, force: true }));
                }
            }
            await Promise.all(deletePromises);
        }
    }
    _ensureDatasetDir() {
        if (!this.isDatasetDirInitialized) {
            (0, fs_extra_1.ensureDirSync)(this.datasetDir);
            this._checkIfStorageIsEmpty("Dataset" /* STORAGE_TYPES.DATASET */, this.datasetDir);
            this.isDatasetDirInitialized = true;
        }
    }
    _ensureKeyValueStoreDir() {
        if (!this.isKeyValueStoreDirInitialized) {
            (0, fs_extra_1.ensureDirSync)(this.keyValueStoreDir);
            this._checkIfStorageIsEmpty("Key-value store" /* STORAGE_TYPES.KEY_VALUE_STORE */, this.keyValueStoreDir);
            this.isKeyValueStoreDirInitialized = true;
        }
    }
    _ensureRequestQueueDir() {
        if (!this.isRequestQueueDirInitialized) {
            (0, fs_extra_1.ensureDirSync)(this.requestQueueDir);
            this._checkIfStorageIsEmpty("Request queue" /* STORAGE_TYPES.REQUEST_QUEUE */, this.requestQueueDir);
            this.isRequestQueueDirInitialized = true;
        }
    }
    _checkIfStorageIsEmpty(storageType, storageDir) {
        const dirsWithPreviousState = [];
        const dirents = (0, fs_extra_1.readdirSync)(storageDir, { withFileTypes: true });
        for (const dirent of dirents) {
            if (!dirent.isDirectory())
                continue;
            const innerStorageDir = (0, path_1.resolve)(storageDir, dirent.name);
            let innerDirents = (0, fs_extra_1.readdirSync)(innerStorageDir).filter((fileName) => !(/(^|\/)\.[^/.]/g).test(fileName));
            if (storageType === "Key-value store" /* STORAGE_TYPES.KEY_VALUE_STORE */) {
                innerDirents = innerDirents.filter((fileName) => !RegExp(consts_1.KEY_VALUE_STORE_KEYS.INPUT).test(fileName));
            }
            if (innerDirents.length) {
                dirsWithPreviousState.push(innerStorageDir);
            }
        }
        const dirsNo = dirsWithPreviousState.length;
        if (dirsNo) {
            log_1.default.warning(`The following ${storageType} director${dirsNo === 1 ? 'y' : 'ies'} contain${dirsNo === 1 ? 's' : ''} a previous state:`
                + `\n      ${dirsWithPreviousState.join('\n      ')}`
                + '\n      If you did not intend to persist the state - '
                + `please clear the respective director${dirsNo === 1 ? 'y' : 'ies'} and re-start the actor.`);
        }
    }
}
exports.ApifyStorageLocal = ApifyStorageLocal;
//# sourceMappingURL=index.js.map