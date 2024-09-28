"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnprocessedRequest = void 0;
class UnprocessedRequest {
    constructor(uniqueKey, url, method) {
        Object.defineProperty(this, "uniqueKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: uniqueKey
        });
        Object.defineProperty(this, "url", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: url
        });
        Object.defineProperty(this, "method", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: method
        });
    }
}
exports.UnprocessedRequest = UnprocessedRequest;
//# sourceMappingURL=unprocessed_request.js.map