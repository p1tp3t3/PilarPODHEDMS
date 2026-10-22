import { APIRequest } from "../classes/api-req";

export const ChatService = {
    getThread(userId, setter, error) {
        const api = new APIRequest(`/chat/thread/${userId}`, "get", {}, setter, () => {}, error);
        api.fetchData();
    },
    send(receiverId, body, replyToId, success, error) {
        const f = new FormData();
        f.append("receiver_id", receiverId);
        f.append("body", body);
        if (replyToId) f.append("reply_to_id", replyToId);
        const api = new APIRequest("/chat/send", "post", f, () => {}, success, error);
        api.sendPostData();
    },
    getUnreadCount(setter, error) {
        const api = new APIRequest("/chat/unread-count", "get", {}, setter, () => {}, error);
        api.fetchData();
    },
    unsend(id, success, error) {
        const api = new APIRequest(`/chat/message/${id}/unsend`, "post", new FormData(), () => {}, success, error);
        api.sendPostData();
    },
    edit(id, body, success, error) {
        const f = new FormData();
        f.append("body", body);
        const api = new APIRequest(`/chat/message/${id}/edit`, "post", f, () => {}, success, error);
        api.sendPostData();
    },
    getHistory(id, setter, error) {
        const api = new APIRequest(`/chat/message/${id}/history`, "get", {}, setter, () => {}, error);
        api.fetchData();
    },
};
