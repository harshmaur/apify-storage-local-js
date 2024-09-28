import { AllowedHttpMethods } from '../../resource_clients/request_queue';
export declare class UnprocessedRequest {
    uniqueKey: string;
    url: string;
    method?: AllowedHttpMethods | undefined;
    constructor(uniqueKey: string, url: string, method?: AllowedHttpMethods | undefined);
}
//# sourceMappingURL=unprocessed_request.d.ts.map