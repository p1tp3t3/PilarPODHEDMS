import { APIRequest } from "../classes/api-req";

export const ProfileService = {
    // key: the profile owner's encrypted id.
    updateProfile(key, data, success, error) {
        const api = new APIRequest(`/profile/${key}/edit`, "post", data, () => {}, success, error);
        api.sendPostData();
    },
};
