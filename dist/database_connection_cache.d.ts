import { Database, Options } from 'better-sqlite3';
/**
 * SQLite prefers to have a single connection shared by
 * all users instead of opening and closing multiple connections.
 */
export declare class DatabaseConnectionCache {
    private connections;
    private enableWalMode;
    openConnection(path: string, options?: Options): Database;
    /**
     * Closes database connection and keeps the data. Should
     * be called at the end of use to allow the process to exit
     * gracefully. No further database operations will be executed.
     */
    closeConnection(path: string): void;
    closeAllConnections(): void;
    /**
     * Closes the database connection and removes all data.
     * With file system databases, it deletes the database file.
     * No further database operations will be executed.
     */
    setWalMode(enableWalMode: boolean): void;
    private _createConnection;
}
//# sourceMappingURL=database_connection_cache.d.ts.map