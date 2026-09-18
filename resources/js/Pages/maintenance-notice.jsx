import { Head } from "@inertiajs/react";
import { motion } from "framer-motion";
import { Wrench } from "lucide-react";
import logo from "@/images/pilar.png";
import background from "@/images/bg-pilar2.jpg";

const MaintenanceNotice = () => {
    return (
        <>
            <Head title="Under Maintenance" />

            <div className="w-full h-[100vh] relative grid place-items-center px-6 overflow-hidden">
                <img src={background} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#000000a6]"></div>

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="relative grid place-items-center gap-5 text-center max-w-[28rem] bg-white rounded-2xl shadow-xl shadow-black/20 px-8 py-10 sm:px-10 sm:py-12"
                >
                    <motion.img
                        src={logo}
                        alt="Pilar College of Zamboanga City, Inc."
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <motion.div
                        className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 grid place-items-center"
                        animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
                    >
                        <Wrench size={26} className="text-blue-600" />
                    </motion.div>

                    <div className="grid gap-2">
                        <h1 className="text-[1.4em] sm:text-[1.6em] font-bold text-gray-800">
                            We'll Be Right Back
                        </h1>
                        <p className="text-gray-500 text-[0.95em] leading-relaxed">
                            PilarPODHED is currently undergoing scheduled maintenance.
                            We're working to improve things and will be back online shortly.
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                        {[0, 1, 2].map((i) => (
                            <motion.span
                                key={i}
                                className="w-2 h-2 rounded-full bg-blue-400"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1, 0.85] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                            />
                        ))}
                    </div>

                    <p className="text-[0.75em] text-gray-400 pt-1">
                        Pilar College of Zamboanga City, Inc.
                    </p>
                </motion.div>
            </div>
        </>
    );
};

export default MaintenanceNotice;
