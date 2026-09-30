import { APIRequest } from "../classes/api-req";
import { sendData } from "../function";

export const PasswordRecoveryService = {
    getContact(username, setter, success, error) {
        const api = new APIRequest(`/contact/${username}`, "post", {}, setter, success, error);
        api.fetchData();
    },
    sendOtp(username, success, error) {
        // Plain-object POSTs go through `sendData` (real JSON body) rather
        // than APIRequest.sendPostData(), whose hardcoded multipart/form-data
        // header has no boundary for non-FormData payloads — Laravel
        // silently receives an empty request body and "username" fails
        // "required" validation every time.
        sendData("/forgot-password/send-otp", { username }, success, error);
    },
    verifyOtp(username, otp, success, error) {
        sendData("/forgot-password/verify-otp", { username, otp }, success, error);
    },
    reset(username, new_password, success, error) {
        sendData(`/reset-password/${username}`, { new_password }, success, error);
    },
};
