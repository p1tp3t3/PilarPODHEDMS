import { APIRequest } from "../classes/api-req";

export const DashboardService = {
    getStudentRisk(encryptedId, setter, error) {
        const api = new APIRequest(`/prefect/student-risk/${encryptedId}`, "get", {}, setter, () => {}, error);
        api.fetchData();
    },
    getWatchList(refresh, setter, error) {
        const api = new APIRequest(`/prefect/watch-list${refresh ? "?refresh=1" : ""}`, "get", {}, setter, () => {}, error);
        api.fetchData();
    },
    getUserGraph(filter, setter) {
        const api = new APIRequest("/api/user-graph", "post", { filter }, setter);
        api.fetchData();
    },
    getBargraph(filter, setter) {
        const api = new APIRequest("/api/bargraph", "post", { filter }, setter);
        api.fetchData();
    },
    getActiveUsers(setter) {
        const api = new APIRequest("/dashboard/active-users", "get", {}, setter);
        api.fetchData();
    },
    getMyCurrentSemesterRecords(setter) {
        const api = new APIRequest("/dashboard/my-current-semester-records", "get", {}, setter);
        api.fetchData();
    },
    getAllCurrentSemesterRecords(setter) {
        const api = new APIRequest("/dashboard/all-current-semester-records", "get", {}, setter);
        api.fetchData();
    },
};
