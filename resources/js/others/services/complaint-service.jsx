import { APIRequest } from "../classes/api-req";

export const ComplaintService = {
    create(formData, success, error) {
        const api = new APIRequest("/complaint/create", "post", formData, () => {}, success, error);
        api.sendPostData();
    },
    getComplaintInfo(complainantId, setter) {
        const api = new APIRequest(`/complainant/get/${complainantId}`, "post", {}, setter);
        api.fetchData();
    },
    confirm(id, setter, success, error) {
        const api = new APIRequest(`/complaint/verify/${id}/confirm`, "post", {}, setter, success, error);
        api.fetchData();
    },
    reject(id, reason, setter, success, error) {
        const api = new APIRequest(`/complaint/verify/${id}/cancel`, "post", { reason }, setter, success, error);
        api.fetchData();
    },
    revoke(id, setter, success, error) {
        const api = new APIRequest(`/complaint/${id}/revoke`, "post", {}, setter, success, error);
        api.fetchData();
    },
    update(id, formData, success, error) {
        const api = new APIRequest(`/complaint/${id}/edit`, "post", formData, () => {}, success, error);
        api.sendPostData();
    },
};
