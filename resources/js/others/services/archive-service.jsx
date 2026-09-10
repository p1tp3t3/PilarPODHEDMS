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
    /**
     * Archive every not-yet-archived record (one type, or 'all') in a date
     * range or school year. onResult receives the parsed response body
     * ({message, counts, date_from, date_to}) — fetchData()'s POST branch
     * (unlike sendPostData()) passes the response through to the setter.
     */
    bulkArchive(data, onResult, onError) {
        const f = new FormData();
        Object.entries(data).forEach(([key, value]) => f.append(key, value));
        const api = new APIRequest("/prefect/archive/bulk", "post", f, onResult, () => {}, onError);
        api.fetchData();
    },
};
