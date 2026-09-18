import { APIRequest } from "../classes/api-req";

export const ReferralService = {
    create(formData, success, error) {
        const api = new APIRequest("/referral/create", "post", formData, () => {}, success, error);
        api.sendPostData();
    },
    getReferralInfo(id, setter) {
        const api = new APIRequest(`/referral/get/${id}`, "post", {}, setter, () => {}, () => {});
        api.fetchData();
    },
    verify(action, id, setter, success, error) {
        const api = new APIRequest(`/referral/verify/${id}/${action}`, "post", {}, setter, success, error);
        api.fetchData();
    },
    reject(id, reason, setter, success, error) {
        const api = new APIRequest(`/referral/verify/${id}/cancel`, "post", { reason }, setter, success, error);
        api.fetchData();
    },
    revoke(id, setter, success, error) {
        const api = new APIRequest(`/referral/${id}/revoke`, "post", {}, setter, success, error);
        api.fetchData();
    },
    update(id, formData, setter, success, error) {
        const api = new APIRequest(`/referral/${id}/edit`, "post", formData, setter, success, error);
        api.sendPostData();
    },
};
