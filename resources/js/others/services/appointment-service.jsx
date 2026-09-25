import { APIRequest } from "../classes/api-req";
import { sendData } from "../function";

export const AppointmentService = {
    schedule(isResched, appointmentId, data, setter, success, error) {
        const url = isResched ? `/appointment/update/${appointmentId}` : "/appointment/request";
        const api = new APIRequest(url, "post", data, setter, success, error);
        api.fetchData();
    },
    cancel(appointmentId, success, error) {
        const api = new APIRequest("/appointment/cancel", "post", { appointment_id: appointmentId }, () => {}, success, error);
        api.fetchData();
    },
    markAttendance(appointmentId, attendanceStatus, success, error) {
        // Plain-object POSTs go through `sendData` (real JSON body) rather
        // than `APIRequest`, whose hardcoded multipart/form-data header has
        // no boundary for non-FormData payloads — Laravel silently receives
        // an empty request body and every field fails "required" validation.
        sendData("/appointment/attendance", { appointment_id: appointmentId, attendance_status: attendanceStatus }, success, error);
    },
    respond(id, action, reason, success, error) {
        const api = new APIRequest("/appointment/action", "post", { id, action, reason }, () => {}, success, error);
        api.sendPostData();
    },
    respondWithSetter(data, setter, success, error) {
        const api = new APIRequest("/appointment/action", "post", data, setter, success, error);
        api.sendPostData();
    },
    callIn(data, success, error) {
        const api = new APIRequest("/prefect/call-in", "post", data, () => {}, success, error);
        api.sendPostData();
    },
};
