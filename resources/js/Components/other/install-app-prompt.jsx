import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, MoreVertical, MoreHorizontal, Menu, X } from "lucide-react";

// "Add to Home Screen" popup (a small card, no backdrop) on every page, signed in or not (app.jsx).
// - Where the browser can install the app itself (HTTPS or localhost):
//   an Install button.
// - Otherwise (e.g. http://192.168.x.x on the school LAN, or HTTPS with an
//   untrusted certificate): steps for adding it from the browser menu, which
//   works over plain HTTP too. Phones get "Add to Home Screen", computers a
//   shortcut that opens in its own window (Chrome, Edge, Safari on Mac;
//   desktop Firefox can't, so it gets no popup).
// Not shown once it's on the home screen; "Not now" hides it for 3 days.

const SNOOZE_KEY = "install-prompt-snoozed-until";
const SNOOZE_DAYS = 3;

const isStandalone = () =>
    window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

const platform = () => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
    if (/SamsungBrowser/i.test(ua)) return "samsung";
    if (/Android/i.test(ua)) return "android";
    // A phone or tablet showing the "Desktop site" reports a computer's
    // user agent: a touch screen without a mouse still gets the phone steps.
    if (navigator.userAgentData?.mobile || (window.matchMedia?.("(pointer: coarse)").matches && !window.matchMedia?.("(any-pointer: fine)").matches)) return "android";
    if (/Edg\//.test(ua)) return "edge";
    if (/Chrome\//.test(ua) && !/OPR\//.test(ua)) return "chrome";
    if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Firefox/.test(ua)) return "mac-safari";
    return null; // Firefox and others on a computer: no way to add it.
};

const snoozed = () => {
    try { return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now(); } catch { return false; }
};

/** Whether the popup may appear on this page (not on the home screen already, not snoozed). */
export const installPopupAllowed = () => !isStandalone() && !snoozed();

// The taps, in order, on one line: e.g. Share › Add to Home Screen › Add.
const PATHS = {
    ios: [[Share, "Share"], [null, "Add to Home Screen"], [null, "Add"]],
    samsung: [[Menu, "Menu"], [null, "Add page to"], [null, "Home screen"]],
    android: [[MoreVertical, "Menu"], [null, "Create shortcut"]],
    chrome: [[MoreVertical, "Menu"], [null, "Cast, save, and share"], [null, "Create shortcut…"]],
    edge: [[MoreHorizontal, "Menu"], [null, "More tools"], [null, "Pin to taskbar"]],
    "mac-safari": [[null, "File"], [null, "Add to Dock…"]],
};

const ManualSteps = ({ os }) => {
    const path = PATHS[os] ?? PATHS.android;
    return (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-gray-600">
            <span>{["ios", "android", "samsung"].includes(os) ? "Tap" : "Click"}</span>
            {path.map(([Icon, label], i) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                    <b className="inline-flex items-center gap-1 font-semibold text-gray-800">
                        {Icon && <Icon size={14} />}{label}
                    </b>
                    {i < path.length - 1 && <span className="text-gray-300">›</span>}
                </span>
            ))}
        </p>
    );
};

const InstallAppPrompt = () => {
    const [deferred, setDeferred] = useState(() => window.__installPromptEvent ?? null);
    const [open, setOpen] = useState(false);
    const os = platform();
    const isPhone = ["ios", "android", "samsung"].includes(os);

    useEffect(() => {
        if (isStandalone() || snoozed()) return;

        const ready = () => { setDeferred(window.__installPromptEvent); setOpen(true); };
        const installed = () => setOpen(false);
        window.addEventListener("install-prompt-ready", ready);
        window.addEventListener("appinstalled", installed);

        // No install event (plain-HTTP LAN, iPhone, …): the manual steps,
        // for any browser that has a way to add it.
        const t = setTimeout(() => {
            if (window.__installPromptEvent || os) setOpen(true);
        }, 2500);

        return () => {
            clearTimeout(t);
            window.removeEventListener("install-prompt-ready", ready);
            window.removeEventListener("appinstalled", installed);
        };
    }, []);

    const notNow = () => {
        try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000)); } catch {}
        setOpen(false);
    };

    const install = async () => {
        if (!deferred) return;
        deferred.prompt();
        const { outcome } = await deferred.userChoice;
        window.__installPromptEvent = null;
        setDeferred(null);
        outcome === "accepted" ? setOpen(false) : notNow();
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    role="dialog"
                    aria-label="Add to home screen"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="fixed z-[150] inset-x-0 mx-auto lg:left-auto lg:right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))]
                        w-[24rem] max-w-[calc(100vw-2rem)] max-h-[85dvh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl shadow-black/15 text-[0.9em]"
                >
                    <button type="button" onClick={notNow} aria-label="Close"
                        className="absolute right-2 top-2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <X size={16} />
                    </button>

                    <div className="flex items-center gap-3 pr-6">
                        <img src="/pwa2/android/android-launchericon-96-96.png" alt="" className="h-11 w-11 shrink-0 drop-shadow" />
                        <div className="min-w-0">
                            <div className="font-bold text-gray-800">{isPhone ? "Add to Home Screen" : "Add to your desktop"}</div>
                            <div className="text-[0.88em] text-gray-500">Open PilarPODHEDMS in one {isPhone ? "tap" : "click"}, like an app.</div>
                        </div>
                    </div>

                    {deferred ? (
                        <div className="mt-3 flex justify-end gap-2">
                            <button type="button" onClick={notNow}
                                className="rounded-md px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-100">
                                Not now
                            </button>
                            <button type="button" onClick={install}
                                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700">
                                <Download size={15} /> Install
                            </button>
                        </div>
                    ) : (
                        <div className="mt-3 border-t border-gray-100 pt-3 text-[0.95em]">
                            <ManualSteps os={os} />
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InstallAppPrompt;
