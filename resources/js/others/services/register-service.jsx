import { APIRequest } from "../classes/api-req";

export const RegisterService = {
    registerUser(data, success, error) {
        const api = new APIRequest("/super-admin/register", "post", data, () => {}, success, error);
        api.sendPostData();
    },
    uploadUserCsv(data, success, error) {
        const api = new APIRequest("/super-admin/register/upload-user", "post", data, () => {}, success, error);
        api.sendPostData();
    },
    previewStudentCsv(data, setter, success, error) {
        const api = new APIRequest("/super-admin/register/preview-student-csv", "post", data, setter, success, error);
        api.fetchData();
    },
    validateStudentCsvRow(row, setter, success, error) {
        const api = new APIRequest("/super-admin/register/validate-student-csv-row", "post", { row }, setter, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.fetchData();
    },
    commitStudentCsv(rows, activate, setter, success, error) {
        const api = new APIRequest(
            "/super-admin/register/commit-student-csv",
            "post",
            { rows, activate },
            setter,
            success,
            error
        );
        api.setHeaders({ "Content-Type": "application/json" });
        api.fetchData();
    },
};
