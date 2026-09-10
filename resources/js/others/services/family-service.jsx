import { APIRequest } from "../classes/api-req";

export const FamilyService = {
    rejectParentRequest(id, reason) {
        const api = new APIRequest(`/super-admin/parent-register/reject/${id}`, "post", { reason });
        api.fetchData();
    },
    getParentRequestInfo(id, success, error) {
        const api = new APIRequest(
            `/super-admin/parent-register/get/${id}`,
            "get",
            {},
            success,
            () => {},
            error
        );
        api.fetchData();
    },
    joinFamily(familyId, success, error) {
        const api = new APIRequest("/student/family/join", "post", { family_id: familyId }, () => {}, success, error);
        api.sendPostData();
    },
    getFamilyList(setter) {
        const api = new APIRequest("/api/family/list", "get", null, setter);
        api.fetchData();
    },
    getFamilyMembers(familyId, setter) {
        const api = new APIRequest(`/api/family/members/${familyId}`, "get", null, setter);
        api.fetchData();
    },
    searchFamilyStudent(text, setter) {
        const api = new APIRequest(`/api/all-users/family-student?search=${text}`, "get", null, setter);
        api.fetchData();
    },
    sendParentRegistration(data, success, error) {
        const api = new APIRequest("/parent-register/send", "post", data, null, success, error);
        api.sendPostData();
    },
};
