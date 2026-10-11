import { APIRequest } from "../classes/api-req";

export const RoleService = {
    create(label, success, error) {
        const api = new APIRequest("/super-admin/roles", "post", { label }, () => {}, success, error);
        api.sendPostData();
    },
    toggle(id, success, error) {
        const api = new APIRequest(`/super-admin/roles/${id}/toggle`, "post", {}, () => {}, success, error);
        api.sendPostData();
    },
    remove(id, success, error) {
        const api = new APIRequest(`/super-admin/roles/${id}/delete`, "post", {}, () => {}, success, error);
        api.sendPostData();
    },
};
