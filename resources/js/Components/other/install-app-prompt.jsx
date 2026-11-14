import { useEffect, useState } from "react";
import { Popover, IconButton, Button } from "@mui/material";
import { Download, Share, MoreVertical, MoreHorizontal, Menu, MonitorSmartphone } from "lucide-react";

// "Add to Home Screen": a round button in the header (header.jsx) that opens
// a panel anchored under it (like the notification panel). Shown only where it can be added and isn't already (not when
// opened from the home screen / as an app; not on desktop Firefox).
// - Where the browser can install the app itself (HTTPS or localhost): an
//   Install button.
// - Otherwise (e.g. http://192.168.x.x on the school LAN): the steps for
//   adding it from the browser menu, which works over plain HTTP too.

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

/** Whether the browser's install offer should be kept for the button (not when already installed). */
export const installPopupAllowed = () => !isStandalone();

// The taps, in order, one numbered step per line.
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
    const verb = ["ios", "android", "samsung"].includes(os) ? "Tap" : "Click";
    return (
        <ol className="grid gap-2 text-gray-600">
            {path.map(([Icon, label], i) => (
                <li key={label} className="flex items-center gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[0.75em] font-bold text-blue-700">
                        {i + 1}
                    </span>
                    <span className="min-w-0">
                        {verb}{" "}
                        <b className="inline-flex items-center gap-1 align-middle font-semibold text-gray-800">
                            {Icon && <Icon size={14} />}{label}
                        </b>
                    </span>
                </li>
            ))}
        </ol>
    );
};

/** The round header button; `sx` is the header's own round-button style. */
const InstallAppButton = ({ sx }) => {
    const [deferred, setDeferred] = useState(() => window.__installPromptEvent ?? null);
    const [anchor, setAnchor] = useState(null);
    const open = Boolean(anchor);
    const setOpen = (v) => { if (!v) setAnchor(null); };
    const [installed, setInstalled] = useState(isStandalone);
    const os = platform();
    const isPhone = ["ios", "android", "samsung"].includes(os);

    useEffect(() => {
        const ready = () => setDeferred(window.__installPromptEvent);
        const done = () => { setInstalled(true); setOpen(false); };
        window.addEventListener("install-prompt-ready", ready);
        window.addEventListener("appinstalled", done);
        return () => {
            window.removeEventListener("install-prompt-ready", ready);
            window.removeEventListener("appinstalled", done);
        };
    }, []);

    if (installed || (!os && !deferred)) return null;

    const install = async () => {
        if (!deferred) return;
        deferred.prompt();
        const { outcome } = await deferred.userChoice;
        window.__installPromptEvent = null;
        setDeferred(null);
        if (outcome === "accepted") setOpen(false);
    };

    const label = isPhone ? "Add to Home Screen" : "Add to your desktop";

    return (
        <>
            <IconButton sx={sx} title={label} aria-label={label} onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
                <MonitorSmartphone size={18} />
            </IconButton>

            <Popover
                open={open}
                anchorEl={anchor}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { mt: 1, borderRadius: "0.75rem", width: "22rem", maxWidth: "calc(100vw - 1.5rem)" } } }}
            >
                <div className="relative p-4">
                    <div className="flex items-center gap-3 text-[0.9em]">
                        <img src="/pwa/android/android-launchericon-96-96.png" alt="" className="h-11 w-11 shrink-0 drop-shadow" />
                        <div className="min-w-0">
                            <div className="font-bold text-gray-800">{label}</div>
                            <div className="text-[0.88em] text-gray-500">Open PilarPODHEDMS in one {isPhone ? "tap" : "click"}, like an app.</div>
                        </div>
                    </div>

                    {deferred ? (
                        <div className="mt-4 flex justify-end gap-2">
                            <Button onClick={() => setOpen(false)} sx={{ textTransform: "none", fontWeight: 600 }}>Not now</Button>
                            <Button variant="contained" onClick={install} startIcon={<Download size={15} />}
                                sx={{ textTransform: "none", fontWeight: 600 }}>
                                Install
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-3 border-t border-gray-100 pt-3 text-[0.88em]">
                            <ManualSteps os={os} />
                        </div>
                    )}
                </div>
            </Popover>
        </>
    );
};

export default InstallAppButton;
