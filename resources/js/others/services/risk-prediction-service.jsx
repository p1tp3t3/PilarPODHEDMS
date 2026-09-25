import { APIRequest } from "../classes/api-req";

export const RiskPredictionService = {
    getStudentIncidentList(studentId, setter) {
        const api = new APIRequest(`/api/student/incident/list/${studentId}`, "get", {}, setter);
        api.fetchData();
    },
    notifyRisk(data, success, error) {
        const api = new APIRequest("/prefect/violation/risk/notify", "post", data, () => {}, success, error);
        api.sendPostData();
    },
};
