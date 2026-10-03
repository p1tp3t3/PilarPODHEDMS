import { APIRequest } from "../classes/api-req";

export const PushNotificationService = {
    storeSubscription(data, success, error) {
        const api = new APIRequest("/store-subscription", "post", data, success, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.sendPostData();
    },
};
