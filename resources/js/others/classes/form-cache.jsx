import { base64ToFile } from "@/others/function";

const PREFIX = "draft-cache:";

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

/**
 * Reusable localStorage draft cache for forms — keeps in-progress field
 * values (including File inputs) so an accidentally closed tab doesn't lose
 * unsaved input. File values are transparently round-tripped through
 * base64 so they survive JSON serialization.
 */
export class FormCache {
    /**
     * Returns true/false rather than swallowing failures silently — a
     * caller that navigates away assuming the draft was saved (e.g. the
     * forced account-setup profile step, which hands off to the password
     * step purely through this cache) needs to know when it wasn't, most
     * commonly because a large profile-picture File blew the localStorage
     * quota once base64-encoded.
     */
    static async save(key, data) {
        try {
            const entries = await Promise.all(
                Object.entries(data).map(async ([k, v]) => {
                    if (v instanceof File) {
                        return [k, { __file: true, name: v.name, base64: await fileToBase64(v) }];
                    }
                    return [k, v];
                })
            );
            localStorage.setItem(PREFIX + key, JSON.stringify(Object.fromEntries(entries)));
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    static load(key) {
        try {
            const raw = localStorage.getItem(PREFIX + key);
            if (!raw) return null;

            const data = JSON.parse(raw);
            Object.entries(data).forEach(([k, v]) => {
                if (v && typeof v === "object" && v.__file) {
                    data[k] = base64ToFile(v.base64, v.name);
                }
            });
            return data;
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    static clear(key) {
        try {
            localStorage.removeItem(PREFIX + key);
        } catch (e) {}
    }
}
