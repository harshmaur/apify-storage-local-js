/// <reference types="node" />
import type { Readable } from 'node:stream';
import { RawQueueTableData, RequestQueueInfo } from './emulators/request_queue_emulator';
/**
 * Removes all properties with a null value
 * from the provided object.
 */
export declare function purgeNullsFromObject<T>(object: T): T;
/**
 * Converts date strings to date objects and adds `id` alias for `name`.
 */
export declare function mapRawDataToRequestQueueInfo(raw?: RawQueueTableData): RequestQueueInfo | undefined;
/**
 * Creates a standard request ID (same as Platform).
 */
export declare function uniqueKeyToRequestId(uniqueKey: string): string;
export declare function isBuffer(value: unknown): boolean;
export declare function isStream(value: unknown): value is Readable;
//# sourceMappingURL=utils.d.ts.map