import { APIRequest } from "../classes/api-req";

export const PositionService = {
    list(setter, success, error) {
        const api = new APIRequest("/super-admin/staff/positions", "get", {}, setter, success, error);
        api.fetchData();
    },
    create(data, setter, success, error) {
        const api = new APIRequest("/super-admin/staff/positions/create", "post", data, setter, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.fetchData();
    },
    update(data, setter, success, error) {
        const api = new APIRequest("/super-admin/staff/positions/update", "post", data, setter, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.fetchData();
    },
    delete(id, setter, success, error) {
        const api = new APIRequest("/super-admin/staff/positions/delete", "post", { id }, setter, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.fetchData();
    },
};
