import { Head } from "@inertiajs/react";
import { motion } from "framer-motion";
import { Wrench, Clock, MessageSquare } from "lucide-react";
import logo from "@/images/pilar.png";
import background from "@/images/bg-pilar2.jpg";
import { useEffect } from "react";
import { Broadcast } from "@/others/classes/broadcast-cofiguration";

const startedText = (iso) => {
    const d = iso ? new Date(iso) : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("en-US", {
        timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });
};

// Shown to everyone but the IT admin while maintenance mode is on
// (CheckMaintenanceMode): when it started and the IT admin's message.
const MaintenanceNotice = ({ started_at, message }) => {
    // Back in automatically the moment maintenance mode turns off.
    useEffect(() => {
        new Broadcast(
            'public',
            'maintenance',
            'MaintenanceModeToggled',
            (e) => {
                if (!e.enabled) window.location.href = '/'
            }
        ).configure('maintenance mode status (blocked page)');
    }, []);

    const started = startedText(started_at);

    return (
        <>
            <Head title="Under Maintenance" />

            {/* Same backdrop and card as the login page. */}
            <div className="w-full min-h-[100dvh] relative flex items-center justify-center px-4 py-8">
                <div className="fixed inset-0">
                    <img src={background} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-[#000000a6]"></div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="relative w-full max-w-[28rem] bg-white rounded-[5px] shadow-xl shadow-black/20 px-6 py-8 sm:px-10 sm:py-10 grid gap-6 text-center"
                >
                    <div className="grid place-items-center gap-3">
                        <img src={logo} alt="Pilar College of Zamboanga City, Inc." className="w-20 h-20 object-contain" />
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[0.75em] font-semibold text-amber-800">
                            <Wrench size={13} /> Under Maintenance
                        </span>
                    </div>

                    <div className="grid gap-2">
                        <h1 className="text-[1.4em] sm:text-[1.5em] font-bold text-gray-800">We'll Be Right Back</h1>
                        <p className="text-gray-500 text-[0.92em] leading-relaxed">
                            PilarPODHEDMS is undergoing maintenance and is temporarily unavailable.
                        </p>
                    </div>

                    {(started || message) && (
                        <div className="grid gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-left text-[0.88em]">
                            {started && (
                                <div className="flex items-start gap-2.5">
                                    <Clock size={16} className="mt-0.5 shrink-0 text-gray-400" />
                                    <div>
                                        <div className="text-[0.85em] text-gray-500">Started</div>
                                        <div className="font-medium text-gray-800">{started}</div>
                                    </div>
                                </div>
                            )}
                            {message && (
                                <div className="flex items-start gap-2.5">
                                    <MessageSquare size={16} className="mt-0.5 shrink-0 text-gray-400" />
                                    <div className="min-w-0">
                                        <div className="text-[0.85em] text-gray-500">Message from the IT admin</div>
                                        <div className="text-gray-800 whitespace-pre-line break-words">{message}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid gap-2 place-items-center">
                        <div className="flex items-center gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <motion.span
                                    key={i}
                                    className="w-2 h-2 rounded-full bg-blue-400"
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1, 0.85] }}
                                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                                />
                            ))}
                        </div>
                        <p className="text-[0.8em] text-gray-500">This page reloads automatically when the system is back.</p>
                    </div>

                    <p className="text-[0.72em] text-gray-400 border-t border-gray-100 pt-4">
                        Office of Student Affairs and Discipline · Pilar College of Zamboanga City, Inc.
                    </p>
                </motion.div>
            </div>
        </>
    );
};

export default MaintenanceNotice;
