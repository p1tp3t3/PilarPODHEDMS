import { APIRequest } from "../classes/api-req";

export const ViolationAccessService = {
    requestAccess(data, success, error) {
        const api = new APIRequest("/violation-access/request", "post", data, () => {}, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.sendPostData();
    },
    getStatus(setter) {
        const api = new APIRequest("/violation-access/status", "get", null, setter);
        api.fetchData();
    },
    getList(setter) {
        const api = new APIRequest("/violation-access", "get", null, setter);
        api.fetchData();
    },
    approve(id, success, error) {
        const api = new APIRequest(`/violation-access/${id}/approve`, "post", {}, () => {}, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.sendPostData();
    },
    deny(id, responseReason, success, error) {
        const api = new APIRequest(`/violation-access/${id}/deny`, "post", { response_reason: responseReason }, () => {}, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.sendPostData();
    },
    revoke(id, success, error) {
        const api = new APIRequest(`/violation-access/${id}/revoke`, "post", {}, () => {}, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.sendPostData();
    },
};
