import { APIRequest } from "../classes/api-req";

export const AccountService = {
    deleteAccount(data, success, error) {
        const api = new APIRequest("/super-admin/user-accounts/del", "post", data, null, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.sendPostData();
    },
    activateAll(ids, status, page, setter) {
        const api = new APIRequest("/super-admin/accounts/activation/all-users", "post", { ids, status, page }, setter);
        api.fetchData();
    },
    toggleActivation(username, status) {
        const api = new APIRequest(`/super-admin/accounts/activation/${username}`, "post", { status });
        api.sendPostData();
    },
    updateUserInfo(data, success, error) {
        const api = new APIRequest("/super-admin/account/update", "post", data, () => {}, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.sendPostData();
    },
    updateAccountInfo(payload, success, error) {
        const api = new APIRequest("/account/update", "post", payload, () => {}, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.sendPostData();
    },
    submitPasswordChange(isForceSetup, data, success, error) {
        const url = isForceSetup ? "/account-setup/complete" : "/account/update";
        const api = new APIRequest(url, "post", data, () => {}, success, error);
        // Forced setup's combined payload carries a real profile_picture
        // File plus nested objects (unique_att, the education-background
        // `data` sub-object) — forcing JSON here silently mangled the file
        // (File -> {} once stringified) and left $request->hasFile() always
        // false server-side, regardless of what was actually picked. Leave
        // APIRequest's own multipart/form-data default in place instead (axios
        // converts a plain object with nested fields/Files into real
        // FormData for that content type); the voluntary path (no file
        // involved) still works the same either way.
        if (!isForceSetup) {
            api.setHeaders({ "Content-Type": "application/json" });
        }
        api.sendPostData();
    },
    deleteAccountFile(fileName, setter) {
        const api = new APIRequest("/super-admin/user-accounts/file/del", "post", { fileName }, setter);
        api.fetchData();
    },
    previewAccountFile(fileName, setter) {
        const api = new APIRequest(`/api/user-account/file/${fileName}/preview`, "get", {}, setter);
        api.fetchData();
    },
    previewAccountFileEntry(fileName, entry, setter) {
        const api = new APIRequest(`/api/user-account/file/${fileName}/preview-entry?entry=${encodeURIComponent(entry)}`, "get", {}, setter);
        api.fetchData();
    },
    assignStaffPosition(data, success, error) {
        const api = new APIRequest("/super-admin/staff/position/assign", "post", data, null, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.sendPostData();
    },
    removeStaffPosition(data, success, error) {
        const api = new APIRequest("/super-admin/staff/position/remove", "post", data, null, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.sendPostData();
    },
    updateEnrollment(data, success, error) {
        const api = new APIRequest("/super-admin/student/update-enrollment", "post", data, () => {}, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.sendPostData();
    },
    previewEnrollmentUpdateCsv(data, setter, success, error) {
        const api = new APIRequest("/super-admin/student/preview-enrollment-update-csv", "post", data, setter, success, error);
        api.fetchData();
    },
    validateEnrollmentUpdateCsvRow(row, setter, success, error) {
        const api = new APIRequest("/super-admin/student/validate-enrollment-update-csv-row", "post", { row }, setter, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.fetchData();
    },
    commitEnrollmentUpdateCsv(rows, setter, success, error) {
        const api = new APIRequest("/super-admin/student/commit-enrollment-update-csv", "post", { rows }, setter, success, error);
        api.setHeaders({ "Content-Type": "application/json" });
        api.fetchData();
    },
};
