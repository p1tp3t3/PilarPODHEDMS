import { APIRequest } from "../classes/api-req";

export const ArchiveService = {
    /** Manually move one record into the archive, regardless of its current status. */
    transfer(type, id, success, error) {
        const f = new FormData();
        f.append("type", type);
        f.append("id", id);
        const api = new APIRequest("/prefect/archive/transfer", "post", f, () => {}, success, error);
        api.sendPostData();
    },
};
