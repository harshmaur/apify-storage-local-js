"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessedRequest = void 0;
const queue_operation_info_1 = require("../queue_operation_info");
class ProcessedRequest extends queue_operation_info_1.QueueOperationInfo {
    constructor(requestId, uniqueKey, requestOrderNo) {
        super(requestId, requestOrderNo);
        Object.defineProperty(this, "uniqueKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: uniqueKey
        });
    }
}
exports.ProcessedRequest = ProcessedRequest;
//# sourceMappingURL=processed_request.js.map