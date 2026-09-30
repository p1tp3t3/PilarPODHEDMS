import GuestLayout from "@/Layouts/guest-layout"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { change, showOutputModal, showWarningModal } from "@/others/function"
import { PasswordRecoveryService } from "@/others/services/password-recovery-service"
import { useEffect, useRef, useState } from "react"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { User, Lock } from "lucide-react"
import shield from "@/images/shield.png"

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

const PasswordRecovery = () => {
    const [step, setStep] = useState("username") // "username" | "otp" | "reset"
    const [username, setUsername] = useState("")
    const [maskedEmail, setMaskedEmail] = useState("")
    const [usernameError, setUsernameError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const handleUsernameChange = (e) => {
        setUsername(e.target.value)
        if (usernameError) setUsernameError("")
    }

    const requestOtp = (e) => {
        e?.preventDefault()
        const trimmed = username.trim()

        if (!trimmed) {
            setUsernameError("Username / User I.D is required")
            return
        }
        if (submitting) return

        setSubmitting(true)
        PasswordRecoveryService.sendOtp(
            trimmed,
            (res) => {
                setSubmitting(false)
                setUsername(trimmed)
                setMaskedEmail(res?.masked_email || "")
                setStep("otp")
            },
            (err) => {
                setSubmitting(false)
                setUsernameError(err.response?.data?.message || "An error occurred")
            }
        )
    }

    if (step === "otp") {
        return (
            <Card>
                <OtpStep
                    username={username}
                    maskedEmail={maskedEmail}
                    onVerified={() => setStep("reset")}
                    onResend={requestOtp}
                />
            </Card>
        )
    }

    if (step === "reset") {
        return (
            <Card>
                <ResetStep username={username} />
            </Card>
        )
    }

    return (
        <Card>
            <div className="mb-6 text-center">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                    Forgot Your Password?
                </h1>
                <p className="text-sm sm:text-base leading-relaxed text-justify">
                    Enter your <b>Username</b> or <b>User I.D</b> below. We'll email a 6-digit
                    verification code to your registered email address.
                </p>
            </div>

            <form className="flex flex-col gap-6" onSubmit={requestOtp}>
                <FormTextfield
                    label="Username / User I.D"
                    type="text"
                    name="username"
                    id="username"
                    val={username}
                    error={usernameError}
                    errorAsterisk={usernameError !== ""}
                    icon={User}
                    change={handleUsernameChange}
                    req={true}
                />

                <div className="w-full flex justify-end">
                    <FormButton
                        label={submitting ? "Sending..." : "Send Verification Code"}
                        type="submit"
                        enable={!submitting}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-all font-semibold"
                    />
                </div>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
                <p>
                    Remember your password?{" "}
                    <Link href="/" className="text-blue-600 hover:underline font-medium">
                        Log in
                    </Link>
                </p>
            </div>
        </Card>
    )
}

const Card = ({ children }) => (
    <div className="flex justify-center items-center bg-gradient-to-br">
        <motion.div
            className="w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl"
            whileHover={{ scale: 1.01 }}
        >
            {children}
        </motion.div>
    </div>
)

const OtpStep = ({ username, maskedEmail, onVerified, onResend }) => {
    const [pin, setPin] = useState(Array(OTP_LENGTH).fill(""))
    const [error, setError] = useState("")
    const [verifying, setVerifying] = useState(false)
    const [time, setTime] = useState(RESEND_SECONDS)
    const inputsRef = useRef([])

    useEffect(() => {
        inputsRef.current[0]?.focus()
        const interval = setInterval(() => {
            setTime((prev) => (prev <= 1 ? 0 : prev - 1))
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    const handleChange = (e, i) => {
        const value = e.target.value
        if (!/^\d?$/.test(value)) return

        const updated = [...pin]
        updated[i] = value
        setPin(updated)
        if (error) setError("")

        if (value && i < pin.length - 1) {
            inputsRef.current[i + 1]?.focus()
        }

        const joined = updated.join("")
        if (joined.length === OTP_LENGTH) {
            verify(joined)
        }
    }

    const handleKeyDown = (e, i) => {
        if (e.key === "Backspace" && !pin[i] && i > 0) {
            inputsRef.current[i - 1]?.focus()
        }
    }

    const verify = (code) => {
        setVerifying(true)
        PasswordRecoveryService.verifyOtp(
            username,
            code,
            () => {
                setVerifying(false)
                onVerified()
            },
            (err) => {
                setVerifying(false)
                setError(err.response?.data?.message || "Invalid or expired code.")
                setPin(Array(OTP_LENGTH).fill(""))
                inputsRef.current[0]?.focus()
            }
        )
    }

    const resend = () => {
        if (time !== 0) return
        onResend()
        setTime(RESEND_SECONDS)
        setPin(Array(OTP_LENGTH).fill(""))
        setError("")
        inputsRef.current[0]?.focus()
    }

    return (
        <div className="grid gap-6">
            <div className="text-center grid gap-2">
                <img src={shield} alt="shield" className="w-20 h-20 sm:w-24 sm:h-24 mx-auto" />
                <h1 className="text-2xl sm:text-3xl font-bold">Enter Verification Code</h1>
                <p className="text-sm sm:text-base text-gray-600">
                    We've sent a 6-digit code to{" "}
                    {maskedEmail ? <b>{maskedEmail}</b> : "the email registered to this account"}.
                </p>
            </div>

            <div className="flex justify-center">
                <div className="flex gap-1.5 sm:gap-3">
                    {pin.map((v, i) => (
                        <div className="w-10 h-12 sm:w-12 sm:h-14 flex-shrink-0" key={i}>
                            <input
                                ref={(el) => (inputsRef.current[i] = el)}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                disabled={verifying}
                                className="w-full h-full border-2 border-gray-300 rounded-lg text-center text-lg sm:text-2xl focus:border-blue-500 outline-none"
                                value={v}
                                onChange={(e) => handleChange(e, i)}
                                onKeyDown={(e) => handleKeyDown(e, i)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-2 text-center">
                {error && <p className="text-red-600 font-semibold text-xs sm:text-sm">{error}</p>}
                <p className="text-xs sm:text-sm text-gray-600">
                    Didn't get a code?{" "}
                    <button
                        type="button"
                        className={`underline font-medium ${time === 0 ? "text-blue-600 hover:text-blue-700" : "text-gray-400 cursor-not-allowed"}`}
                        disabled={time !== 0}
                        onClick={resend}
                    >
                        Resend{time !== 0 ? ` (${time}s)` : ""}
                    </button>
                </p>
                <Link href="/" className="text-blue-600 hover:underline font-medium text-sm">
                    Back to Log in
                </Link>
            </div>
        </div>
    )
}

const ResetStep = ({ username }) => {
    const [data, setData] = useState({ new_password: "", password_confirmation: "" })
    const [errorNewPassword, setErrorNewPassword] = useState("")
    const [errorPassword, setErrorPassword] = useState("")
    const [commonPasswordList, setCommonPasswordList] = useState(null)
    const [reload, setReload] = useState(false)

    useEffect(() => {
        fetch("/storage/list/common-password.txt")
            .then((res) => res.text())
            .then((text) => setCommonPasswordList(new Set(text.split(/\r?\n/).filter(Boolean))))
            .catch((x) => console.log(x))
    }, [])

    const handleChange = (e) => change(e, setData)

    const handleSubmit = (e) => {
        e.preventDefault()

        if (data.new_password === "" && data.password_confirmation === "") {
            setErrorNewPassword("New Password is required")
            setErrorPassword("Password Confirmation is required")
            return
        }
        if (data.new_password === "") {
            setErrorNewPassword("New Password is required")
            setErrorPassword("")
            return
        }
        if (data.password_confirmation === "") {
            setErrorPassword("Password Confirmation is required")
            setErrorNewPassword("")
            return
        }
        if (data.new_password !== data.password_confirmation) {
            setErrorPassword("Passwords do not match. Please try again.")
            setErrorNewPassword("")
            return
        }
        if (commonPasswordList && commonPasswordList.has(data.new_password.toLowerCase())) {
            setErrorNewPassword("This password is too common. Please choose a stronger one.")
            setErrorPassword("")
            return
        }

        showWarningModal(
            "Are you sure you want to reset your password?",
            "Reset Password",
            "Cancel",
            () => {
                setReload(true)
                PasswordRecoveryService.reset(username, data.new_password, success, failed)
            }
        )
    }

    const success = () => {
        setReload(false)
        showOutputModal("Password reset successfully", "s", () => {
            window.location.href = "/"
        })
    }

    const failed = (err) => {
        setReload(false)
        showOutputModal(
            err.response?.data?.message || "Failed to reset password. Please try again.",
            "e",
            () => {}
        )
    }

    return (
        <div className="grid gap-6">
            <div className="grid gap-2 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-gray-800">Reset Your Password</h1>
                <p className="text-sm text-gray-600 leading-snug">
                    Verified! Please enter your new password below.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-6">
                <div className="grid gap-5">
                    <FormTextfield
                        label="New Password"
                        type="password"
                        name="new_password"
                        id="new_password"
                        val={data.new_password}
                        error={errorNewPassword}
                        icon={Lock}
                        change={handleChange}
                        enableShowPassword={true}
                        req={true}
                    />

                    <FormTextfield
                        label="Re-Enter New Password"
                        type="password"
                        name="password_confirmation"
                        id="password_confirmation"
                        val={data.password_confirmation}
                        error={errorPassword}
                        icon={Lock}
                        change={handleChange}
                        enableShowPassword={true}
                        req={true}
                    />
                </div>

                <div className="flex justify-end">
                    <FormButton label="Save Changes" type="submit" enable={!reload} />
                </div>
            </form>
        </div>
    )
}

PasswordRecovery.layout = (page) => <GuestLayout>{page}</GuestLayout>

export default PasswordRecovery
