import { APIRequest } from "../classes/api-req";

export const DashboardService = {
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
