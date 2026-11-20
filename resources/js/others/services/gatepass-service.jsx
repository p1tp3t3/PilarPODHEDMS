import { APIRequest } from "../classes/api-req";
import { sendData } from "../function";

export const GatePassService = {
    request(data, success, error) {
        sendData("/gatepass/create", data, success, error);
    },
    issue(data, success, error) {
        sendData("/prefect/gatepass/create", data, success, error);
    },
    getGatePassInfo(id, setter) {
        const api = new APIRequest(`/gatepass/${id}`, "get", {}, setter);
        api.fetchData();
    },
    // One gate pass for its notification page: the record, or '' when it
    // can't be found (deleted, or not this user's to see).
    getGatePassRecord(id, setter) {
        const api = new APIRequest(`/gatepass/${id}`, "get", {}, (d) => setter((Array.isArray(d) ? d[0] : d) || ''), () => {}, () => setter(''));
        api.fetchData();
    },
    verify(action, id, status, setter, success, error) {
        const api = new APIRequest(`/prefect/gatepass/verify/${id}/${action}`, "post", status, setter, success, error);
        api.fetchData();
    },
    getApprovedUsers(setter) {
        // GET (signed-in route): the old body-less multipart POST made PHP print a
        // "Missing boundary" warning in front of the JSON, so the list never parsed.
        const api = new APIRequest("/gatepass/approved-users", "get");
        api.setSetter(setter);
        api.fetchData();
    },
    revoke(id, setter, success, error) {
        const api = new APIRequest(`/gatepass/${id}/revoke`, "post", {}, setter, success, error);
        api.fetchData();
    },
    update(id, reason, setter, success, error) {
        const api = new APIRequest(`/gatepass/${id}/edit`, "post", { reason }, setter, success, error);
        api.fetchData();
    },
};
