import { APIRequest } from "../classes/api-req";

export const ViolationService = {
    getPenaltyList(setter) {
        const api = new APIRequest("/api/penalty-list", "get", {}, setter);
        api.fetchData();
    },
    saveViolation(action, payload, setter, success, error) {
        const url = action === "add" ? "/maintenance/violation/create" : "/maintenance/violation/update";
        const api = new APIRequest(url, "post", payload, setter, success, error);
        api.fetchData();
    },
    deleteViolation(id, setter, success, error) {
        const api = new APIRequest("/maintenance/violation/delete", "post", { id }, setter, success, error);
        api.fetchData();
    },
    // Archive a violation that has records (one without is deleted), or restore it.
    archiveViolation(id, setter, success, error) {
        const api = new APIRequest("/maintenance/violation/archive", "post", { id }, setter, success, error);
        api.fetchData();
    },
    restoreViolation(id, setter, success, error) {
        const api = new APIRequest("/maintenance/violation/restore", "post", { id }, setter, success, error);
        api.fetchData();
    },
    createPenalty(data, setter, success, error) {
        const api = new APIRequest("/maintenance/penalty/create", "post", data, setter, success, error);
        api.fetchData();
    },
    deletePenalty(id, setter, success, error) {
        const api = new APIRequest("/maintenance/penalty/delete", "post", { id }, setter, success, error);
        api.fetchData();
    },
    getOffenseList(setter) {
        const api = new APIRequest("/api/offense-list", "get", null, setter);
        api.fetchData();
    },
    getViolationOccurrenceList(userId, setter) {
        const api = new APIRequest(`/violation-occurence/list/${userId}`, "get", null, setter);
        api.fetchData();
    },
    resolveComplaintToViolation(formData, success, error) {
        const api = new APIRequest("/prefect/violation/create", "post", formData, () => {}, success, error);
        api.sendPostData();
    },
};
