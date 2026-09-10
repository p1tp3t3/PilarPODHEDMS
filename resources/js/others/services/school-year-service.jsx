import { APIRequest } from "../classes/api-req";

export const SchoolYearService = {
    create(year, setter, success, error) {
        const f = new FormData();
        f.append("year", year);
        const api = new APIRequest("/super-admin/school-year/create", "post", f, setter, success, error);
        api.fetchData();
    },
    activate(id, setter, success, error) {
        const f = new FormData();
        f.append("id", id);
        const api = new APIRequest("/super-admin/school-year/activate", "post", f, setter, success, error);
        api.fetchData();
    },
    close(id, setter, success, error) {
        const f = new FormData();
        f.append("id", id);
        const api = new APIRequest("/super-admin/school-year/close", "post", f, setter, success, error);
        api.fetchData();
    },
    delete(id, setter, success, error) {
        const f = new FormData();
        f.append("id", id);
        const api = new APIRequest("/super-admin/school-year/delete", "post", f, setter, success, error);
        api.fetchData();
    },
};
