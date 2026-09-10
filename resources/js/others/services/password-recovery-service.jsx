import { APIRequest } from "../classes/api-req";

export const PasswordRecoveryService = {
    getContact(username, setter, success, error) {
        const api = new APIRequest(`/contact/${username}`, "post", {}, setter, success, error);
        api.fetchData();
    },
    sendLink(username, success, error) {
        const api = new APIRequest("/forgot-password/send-link", "post", { username }, () => {}, success, error);
        api.sendPostData();
    },
    reset(username, new_password, success, error) {
        const api = new APIRequest(`/reset-password/${username}`, "post", { new_password }, () => {}, success, error);
        api.sendPostData();
    },
};
