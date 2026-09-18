import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const UpModal = ({
  children,
  close = false,
  cntr = false,
  w = "w-auto",
  pd = ["px-3", "py-2"],
  bgColor = "bg-white",
  textColor = "text-black",
  isEnableOuterClose = false,
  closeModal = () => {},
}) => {
  // Disable background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = close ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [close]);

  // Transition / positioning states
  const center = cntr ? "grid place-items-center" : "";

  const enableOuterClose = () => {
    if (isEnableOuterClose) closeModal(!close);
  };

  return (
    <motion.div
      className={`fixed inset-0 z-[200] ${center} overflow-y-auto overflow-x-hidden`}
      style={{ pointerEvents: close ? 'auto' : 'none' }}
      initial={false}
      animate={{ opacity: close ? 1 : 0, backgroundColor: close ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)' }}
      transition={{ duration: 0.2 }}
      onClick={enableOuterClose}
    >
      {/* Wrapper for spacing and scroll */}
      <div
        className="w-full h-full px-4 py-5 sm:px-6 flex justify-center items-start"
      >
        {/* Modal container */}
        <motion.div
          initial={false}
          animate={{ y: close ? 0 : 40, opacity: close ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`relative ${w} max-w-[95vw] shadow-md rounded-md ${pd[0]} ${pd[1]} ${bgColor} ${textColor}`}
          onClick={(e) => e.stopPropagation()}
        >
            {/* ❌ Close button */}
          {isEnableOuterClose &&
          <button
            onClick={() => closeModal(false)}
            className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl font-bold focus:outline-none transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>}
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default UpModal;
