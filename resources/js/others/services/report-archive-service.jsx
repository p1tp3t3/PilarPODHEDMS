import axios from "axios";
import { APIRequest } from "../classes/api-req";
import { openPdfTab } from "../function";

export const ReportArchiveService = {
    recover(id, type, setter, success, error) {
        const f = new FormData();
        f.append("id", id);
        f.append("type", type);
        const api = new APIRequest("/prefect/archive/recover", "post", f, () => {}, success, error);
        api.sendPostData();
    },
    // Download Archive form: one ZIP for the school year / semester. On an
    // error the blob body is read for the server's message.
    downloadArchive(data, fileName, success, error) {
        // Arrays (the complaint sides) go as sides[]=..&sides[]=..
        const params = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) value.forEach((v) => params.append(`${key}[]`, v));
            else params.append(key, value ?? "");
        });
        const query = params.toString();
        axios.get(`/prefect/archive/download?${query}`, { responseType: "blob" })
            .then((response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement("a");
                link.href = url;
                // The server's name (it adds the picked person's ID number).
                const named = /filename="?([^";]+)"?/.exec(response.headers["content-disposition"] ?? "");
                link.setAttribute("download", named ? named[1] : fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                success();
            })
            .catch(async (e) => {
                let message = null;
                try {
                    const body = JSON.parse(await e.response.data.text());
                    message = body.message ?? null;
                } catch {}
                error(message);
            });
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
    // PDF: generated and shown in a new tab (see openPdfTab) instead of downloaded.
    openActionLogReportTab(data) {
        return openPdfTab(`/super-admin/report/generate?${new URLSearchParams(data).toString()}`, "Action Log Report");
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
    // fileType: "pdf" or "excel" (the row's two Generate buttons).
    generateFromReportFilter(id, fileType, success, error) {
        const api = new APIRequest(`/prefect/report-filter/${id}/generate`, "post", { file_type: fileType }, () => {}, success, error);
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
