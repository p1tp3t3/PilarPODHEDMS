import { APIRequest } from "../classes/api-req";

export const NotificationService = {
    // userId is the user's encrypted_id (the server only answers for your own).
    list(type, userId, count, setter) {
        const api = new APIRequest(`/api/notification/list/${type}/${userId}/${count}`, "get", {}, setter);
        api.fetchData();
    },
    deleteSelected(ids, setter) {
        const api = new APIRequest("/notifications/delete/select-multiple", "post", { notif_id_list: ids }, setter);
        api.fetchData();
    },
    deleteOne(id, setter) {
        const api = new APIRequest("/notifications/delete/select-one", "post", { id }, setter);
        api.fetchData();
    },
    markAllAsRead(setter) {
        const api = new APIRequest("/notification/read", "post", { type: "select-all" }, setter);
        api.fetchData();
    },
    getCallInList(setter) {
        const api = new APIRequest("/api/notification/callin", "get", {}, setter);
        api.fetchData();
    },
    getByType(type, setter) {
        const api = new APIRequest(`/api/notification/${type}`, "get", {}, setter);
        api.fetchData();
    },
    getInitial(userId, count, setter, error) {
        const api = new APIRequest(`/notification/${userId}/${count}`, "get", {}, setter, () => {}, error);
        api.fetchData();
    },
    markOneRead(id) {
        const api = new APIRequest("/notification/read", "post", { id, type: "select-one" });
        api.sendPostData();
    },
};
