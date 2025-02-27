"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_API_PARAM_LIMIT = exports.DATABASE_FILE_SUFFIXES = exports.DATABASE_FILE_NAME = exports.STORAGE_NAMES = exports.STORAGE_TYPES = exports.TIMESTAMP_SQL = exports.REQUEST_ID_LENGTH = void 0;
/**
 * Length of id property of a Request instance in characters.
 */
exports.REQUEST_ID_LENGTH = 15;
/**
 * SQL that produces a timestamp in the correct format.
 */
exports.TIMESTAMP_SQL = "STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'NOW')";
/**
 * Types of all emulated storages (currently used for warning messages only).
 */
var STORAGE_TYPES;
(function (STORAGE_TYPES) {
    STORAGE_TYPES["REQUEST_QUEUE"] = "Request queue";
    STORAGE_TYPES["KEY_VALUE_STORE"] = "Key-value store";
    STORAGE_TYPES["DATASET"] = "Dataset";
})(STORAGE_TYPES || (exports.STORAGE_TYPES = STORAGE_TYPES = {}));
;
/**
 * Names of all emulated storages.
 */
var STORAGE_NAMES;
(function (STORAGE_NAMES) {
    STORAGE_NAMES["REQUEST_QUEUES"] = "request_queues";
    STORAGE_NAMES["KEY_VALUE_STORES"] = "key_value_stores";
    STORAGE_NAMES["DATASETS"] = "datasets";
})(STORAGE_NAMES || (exports.STORAGE_NAMES = STORAGE_NAMES = {}));
;
/**
 * Name of the request queue master database file.
 */
exports.DATABASE_FILE_NAME = 'db.sqlite';
/**
 * To enable high performance WAL mode, SQLite creates 2 more
 * files for performance optimizations.
 */
exports.DATABASE_FILE_SUFFIXES = ['-shm', '-wal'];
/**
 * Except in dataset items, the default limit for API results is 1000.
 */
exports.DEFAULT_API_PARAM_LIMIT = 1000;
//# sourceMappingURL=consts.js.map