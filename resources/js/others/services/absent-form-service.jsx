import { APIRequest } from "../classes/api-req";

export const AbsentFormService = {
    submit(formData, success, error) {
        const api = new APIRequest("/student/absent-form/create", "post", formData, () => {}, success, error);
        api.sendPostData();
    },
    update(id, formData, success, error) {
        const api = new APIRequest(`/student/absent-form/${id}/update`, "post", formData, () => {}, success, error);
        api.sendPostData();
    },
    note(id, data, setter, success, error) {
        const api = new APIRequest(`/prefect/absent-form/verify/${id}/confirm`, "post", data, setter, success, error);
        api.fetchData();
    },
    reject(id, reason, setter, success, error) {
        const api = new APIRequest(`/prefect/absent-form/verify/${id}/cancel`, "post", { reason }, setter, success, error);
        api.fetchData();
    },
    getAbsentFormInfo(id, setter) {
        const api = new APIRequest(`/absent-form/get/${id}`, "post", {}, setter);
        api.fetchData();
    },
    revoke(id, setter, success, error) {
        const api = new APIRequest(`/student/absent-form/${id}/revoke`, "post", {}, setter, success, error);
        api.fetchData();
    },
};
