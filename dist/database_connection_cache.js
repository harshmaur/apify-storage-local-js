"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConnectionCache = void 0;
const tslib_1 = require("tslib");
const better_sqlite3_1 = tslib_1.__importDefault(require("better-sqlite3"));
/**
 * SQLite prefers to have a single connection shared by
 * all users instead of opening and closing multiple connections.
 */
class DatabaseConnectionCache {
    constructor() {
        Object.defineProperty(this, "connections", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "enableWalMode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
    openConnection(path, options) {
        const existingConnection = this.connections.get(path);
        if (existingConnection)
            return existingConnection;
        const newConnection = this._createConnection(path, options);
        this.connections.set(path, newConnection);
        return newConnection;
    }
    /**
     * Closes database connection and keeps the data. Should
     * be called at the end of use to allow the process to exit
     * gracefully. No further database operations will be executed.
     */
    closeConnection(path) {
        const connection = this.connections.get(path);
        if (connection) {
            connection.close();
            this.connections.delete(path);
        }
    }
    closeAllConnections() {
        this.connections.forEach((conn) => conn.close());
        this.connections.clear();
    }
    /**
     * Closes the database connection and removes all data.
     * With file system databases, it deletes the database file.
     * No further database operations will be executed.
     */
    // dropDatabase() {
    //     this.db.close();
    //     if (this.inMemory) return;
    //     fs.unlinkSync(this.dbFilePath);
    //
    //     // It seems that the extra 2 files are automatically deleted
    //     // when the original file is deleted, but I'm not sure if
    //     // this applies to all OSs.
    //     DATABASE_FILE_SUFFIXES.forEach((suffix) => {
    //         try {
    //             fs.unlinkSync(`${this.dbFilePath}${suffix}`);
    //         } catch (err) {
    //             if (err.code !== 'ENOENT') throw err;
    //         }
    //     });
    // }
    setWalMode(enableWalMode) {
        if (this.connections.size) {
            throw new Error(`Cannot ${enableWalMode ? 'enable' : 'disable'} WAL mode while there are open database connections`);
        }
        this.enableWalMode = enableWalMode;
    }
    _createConnection(path, options) {
        let connection;
        try {
            connection = new better_sqlite3_1.default(path, options);
        }
        catch (err) {
            if (/cannot open database because the directory does not exist/i.test(err.message)) {
                err.code = 'ENOENT';
                throw err;
            }
            throw new Error(`Connection to database could not be established at ${path}\nCause: ${err.message}`);
        }
        // WAL mode should greatly improve performance
        // https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/performance.md
        if (this.enableWalMode)
            connection.exec('PRAGMA journal_mode = WAL');
        connection.exec('PRAGMA foreign_keys = ON');
        return connection;
    }
}
exports.DatabaseConnectionCache = DatabaseConnectionCache;
//# sourceMappingURL=database_connection_cache.js.map