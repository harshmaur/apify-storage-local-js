import { QueueOperationInfo } from '../queue_operation_info';
export declare class ProcessedRequest extends QueueOperationInfo {
    uniqueKey: string;
    constructor(requestId: string, uniqueKey: string, requestOrderNo?: number | null);
}
//# sourceMappingURL=processed_request.d.ts.map