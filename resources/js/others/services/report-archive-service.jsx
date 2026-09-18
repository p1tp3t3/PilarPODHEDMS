import { APIRequest } from "../classes/api-req";

export const ReportArchiveService = {
    recover(id, type, setter, success, error) {
        const f = new FormData();
        f.append("id", id);
        f.append("type", type);
        const api = new APIRequest("/prefect/archive/recover", "post", f, () => {}, success, error);
        api.sendPostData();
    },
    deleteArchived(type, id, success, error) {
        const f = new FormData();
        f.append("type", type);
        f.append("id", id);
        const api = new APIRequest("/prefect/archive/delete", "post", f, () => {}, success, error);
        api.sendPostData();
    },
    deleteReport(id, setter) {
        const api = new APIRequest("/prefect/report/delete", "post", { id }, setter);
        api.fetchData();
    },
    downloadIncidentReport(data, fileName, success, error) {
        const query = new URLSearchParams(data).toString();
        const api = new APIRequest(`/prefect/report/generate?${query}`, "get", {}, () => {}, success, error);
        api.downloadFile(fileName);
    },
    generateReport(data, success, error) {
        const api = new APIRequest("/prefect/report/generate", "post", data, () => {}, success, error);
        api.sendPostData();
    },
    generateAnalyticReport(data, success, error) {
        const api = new APIRequest("/prefect/analytic-report/generate", "post", data, () => {}, success, error);
        api.sendPostData();
    },
    getAnalyticsPreview(data, setter) {
        const query = new URLSearchParams(data).toString();
        const api = new APIRequest(`/prefect/analytics/preview?${query}`, "get", {}, setter);
        api.fetchData();
    },
    getProgramViolationDetail(data, setter) {
        const query = new URLSearchParams(data).toString();
        const api = new APIRequest(`/prefect/analytics/program-detail?${query}`, "get", {}, setter);
        api.fetchData();
    },
    getAccountStatisticsPreview(data, setter) {
        const query = new URLSearchParams(data).toString();
        const api = new APIRequest(`/super-admin/report/statistics-preview?${query}`, "get", {}, setter);
        api.fetchData();
    },
    generateAccountStatisticsReport(data, success, error) {
        const api = new APIRequest("/super-admin/report/statistics/generate", "post", data, () => {}, success, error);
        api.sendPostData();
    },
    checkDuplicateReport(data, setter) {
        const api = new APIRequest("/prefect/report/check-duplicate", "post", data, setter);
        api.fetchData();
    },
    getReportHistory(setter) {
        const api = new APIRequest("/prefect/report/history", "get", {}, setter);
        api.fetchData();
    },
    deleteGeneratedReport(id, success, error) {
        const api = new APIRequest(`/prefect/report/delete/${id}`, "post", {}, () => {}, success, error);
        api.sendPostData();
    },
    downloadActionLogReport(data, fileName, success, error) {
        const query = new URLSearchParams(data).toString();
        const api = new APIRequest(`/super-admin/report/generate?${query}`, "get", {}, () => {}, success, error);
        api.downloadFile(fileName);
    },
    getReportFilters(setter) {
        const api = new APIRequest("/prefect/report-filter", "get", {}, setter);
        api.fetchData();
    },
    createReportFilter(data, success, error) {
        const api = new APIRequest("/prefect/report-filter", "post", data, () => {}, success, error);
        api.sendPostData();
    },
    updateReportFilter(id, data, success, error) {
        const api = new APIRequest(`/prefect/report-filter/${id}/update`, "post", data, () => {}, success, error);
        api.sendPostData();
    },
    deleteReportFilter(id, success, error) {
        const api = new APIRequest(`/prefect/report-filter/${id}/delete`, "post", {}, () => {}, success, error);
        api.sendPostData();
    },
    generateFromReportFilter(id, success, error) {
        const api = new APIRequest(`/prefect/report-filter/${id}/generate`, "post", {}, () => {}, success, error);
        api.sendPostData();
    },
    getStudentIncidentGroups(userId, setter) {
        const api = new APIRequest(`/api/student/incident/${userId}`, "get", null, setter);
        api.fetchData();
    },
    getIncidentList(link, setter) {
        const api = new APIRequest(link, "get", {}, setter);
        api.fetchData();
    },
};
