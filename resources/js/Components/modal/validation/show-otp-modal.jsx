import { useEffect, useRef, useState } from "react"
import AlertModal from "../alert-modal"
import shield from '@/images/shield.png'
import { AuthService } from "@/others/services/auth-service"
import OtpInput from "@/Components/input/otp-input"
import { Box, Button, Divider, Stack, Typography } from "@mui/material"

const OtpModal = (props) => {
    return (
        <AlertModal
            close={props.close}
            pd={["px-4", "py-4"]}
            isEnableOuterClose={props.isEnableOuterClose}
            closeModal={props.closeModal}
            bgColor="bg-white"
            w="w-[95%] sm:w-[32rem] md:w-[35rem]"
            cntr={true}
        >
            <Body 
                proceedEvent={props.proceedEvent} 
                contact={props.contact} 
                close={props.close} 
                username={props.username}
                closeModal={props.closeModal}
                type={props.type}
            />
        </AlertModal>
    )
}

const Body = (props) => {
    const [pin, setPin] = useState(["", "", "", "", "", ""]);
    const [time, setTime] = useState(60);
    const [invalid, setInvalid] = useState(false);
    const [error, setError] = useState("");

    const [generatedPin, setGeneratedPin] = useState("");   // ✅ NEW STATE

    const otpRef = useRef(null);

    useEffect(() => {
        if (props.close) {
            resetFields();
            generateNewOtp();   // ⬅️ Generate & send fresh OTP when modal opens
            startTimer();
        }
    }, [props.close]);

    /** -------------------------------------------------------
     * 🔐 Generate new OTP (6 digits)
     * -------------------------------------------------------- */
    const generateNewOtp = () => {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedPin(otp);
        sendOtp(otp);
    };

    /** -------------------------------------------------------
     * 📩 Send OTP to backend
     * -------------------------------------------------------- */
    const sendOtp = (otp) => {
        AuthService.sendOtp(otp, props.username, props.contact.email, props.type, () => {}, () => {});
    };

    const handleChange = (next) => {
        setPin(next);
        if (error) setError("");
    };

    /** -------------------------------------------------------
     * 🧪 Validate the OTP input
     * -------------------------------------------------------- */
    const validateOtp = (value) => {
        setError("");

        if (invalid) {
            setError("This code has expired. Please resend a new one.");
            return resetFields();
        }
        
        AuthService.verifyOtp(value, props.contact.email, () => props.proceedEvent(value), () => setError("The code is incorrect. Please try again."))
        resetFields();
    };

    const resetFields = () => {
        setPin(["", "", "", "", "", ""]);
        setTimeout(() => otpRef.current?.focus());
    };

    /** -------------------------------------------------------
     * ⏳ Timer
     * -------------------------------------------------------- */
    const startTimer = () => {
        setTime(60);
        setInvalid(false);

        const interval = setInterval(() => {
            setTime((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setInvalid(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    /** -------------------------------------------------------
     * 🔄 Resend OTP
     * -------------------------------------------------------- */
    const resendOtp = () => {
        if (time === 0) {
            generateNewOtp();   // ⬅️ New generated OTP
            startTimer();
        }
    };

    const getContact = () => {
        return props.contact?.email || props.contact?.contact_number || "";
    };

    const maskEmail = (value) => {
        if (!value) return "your registered contact";
        if (!value.includes("@")) {
            return `${"*".repeat(Math.max(value.length - 2, 0))}${value.slice(-2)}`;
        }
        const [local, domain] = value.split("@");
        return `${local[0] ?? ""}${local[1] ?? ""}****@${domain ?? ""}`;
    };

    return (
        <Box sx={{ width: "100%", px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 } }}>
            <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center", mb: 3 }}>
                <Box component="img" src={shield} alt="" sx={{ width: { xs: 64, sm: 72 }, height: { xs: 64, sm: 72 }, mb: 0.5 }} />
                <Typography component="h1" sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700, lineHeight: 1.25 }}>
                    Enter Verification Code
                </Typography>
                <Typography sx={{ fontSize: { xs: 13.5, sm: 14.5 }, color: "text.secondary", lineHeight: 1.6 }}>
                    We've sent a 6-digit code to <b>{maskEmail(getContact())}</b>.
                </Typography>
            </Stack>

            <OtpInput ref={otpRef} value={pin} onChange={handleChange} onComplete={validateOtp} error={!!error} />

            <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center", mt: 2.5 }}>
                {error && <Typography sx={{ color: "error.main", fontWeight: 600, fontSize: 13.5 }}>{error}</Typography>}
                <Typography sx={{ fontSize: 13.5, color: time === 0 ? "error.main" : "text.secondary" }}>
                    {time === 0 ? "The code has expired." : <>The code is valid for <b>{time}s</b>.</>}
                </Typography>
                <Typography component="div" sx={{ fontSize: 13.5, color: "text.secondary" }}>
                    Didn't get a code?{" "}
                    <Button
                        variant="text"
                        size="small"
                        disabled={time !== 0}
                        onClick={resendOtp}
                        sx={{ minWidth: 0, p: "2px 6px", fontSize: 13.5, fontWeight: 600, textTransform: "none", verticalAlign: "baseline" }}
                    >
                        Resend Code
                    </Button>
                </Typography>
                <Divider flexItem sx={{ my: 0.5 }} />
                <Button
                    variant="text"
                    color="inherit"
                    onClick={() => props.closeModal(false)}
                    sx={{ fontSize: 14, fontWeight: 600, textTransform: "none", color: "text.secondary" }}
                >
                    Cancel
                </Button>
            </Stack>
        </Box>
    );
};

export default OtpModal;
