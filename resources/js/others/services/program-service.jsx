import { APIRequest } from "../classes/api-req";

export const ProgramService = {
    save(action, formData, setter, success, error) {
        const url = action === "add" ? "/maintenance/program/create" : "/maintenance/program/update";
        const api = new APIRequest(url, "post", formData, setter, success, error);
        api.fetchData();
    },
    delete(id, setter, success, error) {
        const api = new APIRequest("/maintenance/program/delete", "post", { id }, setter, success, error);
        api.fetchData();
    },
    // Archive a program that has users or records (one without is deleted), or restore it.
    archive(id, setter, success, error) {
        const api = new APIRequest("/maintenance/program/archive", "post", { id }, setter, success, error);
        api.fetchData();
    },
    restore(id, setter, success, error) {
        const api = new APIRequest("/maintenance/program/restore", "post", { id }, setter, success, error);
        api.fetchData();
    },
    getStudentPrograms(setter) {
        const api = new APIRequest("/api/student/program", "get", {}, setter);
        api.fetchData();
    },
};
