import { APIRequest } from "../classes/api-req";
import { sendData } from "../function";

export const SystemService = {
    toggleMaintenanceMode(enabled, success, error) {
        const api = new APIRequest("/maintenance/mode/toggle", "post", { enabled }, success, () => {}, error);
        api.fetchData();
    },
    notifyMaintenance(message, success, error) {
        sendData("/maintenance/notify", { message }, success, error);
    },
    getBackups(setter) {
        const api = new APIRequest("/maintenance/backups", "get", {}, setter);
        api.fetchData();
    },
    getSystemInfo(setter) {
        const api = new APIRequest("/maintenance/system-info", "get", {}, setter);
        api.fetchData();
    },
    createBackup(endpoint, success, error) {
        const api = new APIRequest(endpoint, "post", {}, () => {}, success, error);
        api.sendPostData();
    },
    deleteBackup(name, success, error) {
        const api = new APIRequest(`/maintenance/backups/${name}/delete`, "post", {}, () => {}, success, error);
        api.sendPostData();
    },
    updateAppName(appName, success, error) {
        const api = new APIRequest("/system-settings/app-name", "post", { app_name: appName }, () => {}, success, error);
        api.fetchData();
    },
    updateLoginPortalPassword(data, success, error) {
        const api = new APIRequest("/system-settings/login-portal-password", "post", data, () => {}, success, error);
        api.fetchData();
    },
    saveMailConfig(data, success, error) {
        const api = new APIRequest("/system-settings/mail-config", "post", data, () => {}, success, error);
        api.fetchData();
    },
    sendTestEmail(testEmail, success, error) {
        const api = new APIRequest("/system-settings/mail-config/test", "post", { test_email: testEmail }, () => {}, success, error);
        api.fetchData();
    },
    updateArchiveRetention(years, success, error) {
        const f = new FormData();
        f.append("retention_years", years);
        const api = new APIRequest("/system-settings/archive-retention", "post", f, () => {}, success, error);
        api.sendPostData();
    },
};
