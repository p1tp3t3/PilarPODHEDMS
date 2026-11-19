import GuestLayout from "@/Layouts/guest-layout"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { change, showOutputModal, showWarningModal } from "@/others/function"
import { PasswordRecoveryService } from "@/others/services/password-recovery-service"
import { useEffect, useRef, useState } from "react"
import { Head, Link } from "@inertiajs/react"
import { User, Lock } from "lucide-react"
import { Box, Button, CircularProgress, Divider, Link as MuiLink, Paper, Stack, Typography } from "@mui/material"
import OtpInput from "@/Components/input/otp-input"
import shield from "@/images/shield.png"
import { Validator } from "@/others/classes/validator"

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

        const usernameError = Validator.recoveryUsername(trimmed)
        if (usernameError) {
            setUsernameError(usernameError)
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
            <Heading
                title="Forgot Your Password?"
                desc={<>Enter your <b>Username</b> or <b>User I.D</b>. We'll email a 6-digit verification code to your registered email address.</>}
            />

            <Box component="form" onSubmit={requestOtp} sx={{ display: "grid", gap: 3 }}>
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

                <Box sx={ACTIONS}>
                    <FormButton
                        label={submitting ? "Sending..." : "Send Verification Code"}
                        type="submit"
                        enable={!submitting}
                        loading={submitting}
                    />
                </Box>
            </Box>

            <Typography sx={{ mt: 3, textAlign: "center", fontSize: 14, color: "text.secondary" }}>
                Remember your password? <BackLink>Log in</BackLink>
            </Typography>
        </Card>
    )
}

// The submit button: full width on phones, right-aligned otherwise.
const ACTIONS = { display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" }, "& > button": { width: { xs: "100%", sm: "auto" } } }

// The white card every step sits in.
const Card = ({ children }) => (
    <>
        <Head title="Password Recovery" />
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 480,
                    p: { xs: 3, sm: 4 },
                    borderRadius: 4,
                    boxShadow: "0 20px 50px rgba(0,0,0,.28)",
                }}
            >
                {children}
            </Paper>
        </Box>
    </>
)

// Title and a short line under it, centred (an image above, if given).
const Heading = ({ image, title, desc }) => (
    <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center", mb: 3 }}>
        {image && <Box component="img" src={image} alt="" sx={{ width: { xs: 64, sm: 72 }, height: { xs: 64, sm: 72 }, mb: 0.5 }} />}
        <Typography component="h1" sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 700, lineHeight: 1.25 }}>{title}</Typography>
        {desc && <Typography sx={{ fontSize: { xs: 13.5, sm: 14.5 }, color: "text.secondary", lineHeight: 1.6, maxWidth: 400 }}>{desc}</Typography>}
    </Stack>
)

const BackLink = ({ children }) => (
    <MuiLink component={Link} href="/" underline="hover" sx={{ fontWeight: 600, color: "primary.main" }}>{children}</MuiLink>
)

const OtpStep = ({ username, maskedEmail, onVerified, onResend }) => {
    const [pin, setPin] = useState(Array(OTP_LENGTH).fill(""))
    const [error, setError] = useState("")
    const [verifying, setVerifying] = useState(false)
    const [time, setTime] = useState(RESEND_SECONDS)
    const otpRef = useRef(null)

    useEffect(() => {
        otpRef.current?.focus()
        const interval = setInterval(() => {
            setTime((prev) => (prev <= 1 ? 0 : prev - 1))
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    const handleChange = (next) => {
        setPin(next)
        if (error) setError("")
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
                setTimeout(() => otpRef.current?.focus())
            }
        )
    }

    const resend = () => {
        if (time !== 0) return
        onResend()
        setTime(RESEND_SECONDS)
        setPin(Array(OTP_LENGTH).fill(""))
        setError("")
        otpRef.current?.focus()
    }

    return (
        <Box>
            <Heading
                image={shield}
                title="Enter Verification Code"
                desc={<>We've sent a 6-digit code to {maskedEmail ? <b>{maskedEmail}</b> : "the email registered to this account"}.</>}
            />

            <OtpInput ref={otpRef} value={pin} onChange={handleChange} onComplete={verify} disabled={verifying} error={!!error} />

            <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center", mt: 2.5 }}>
                {verifying && (
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
                        <CircularProgress size={14} />
                        <Typography sx={{ fontSize: 13 }}>Verifying...</Typography>
                    </Stack>
                )}
                {error && <Typography sx={{ color: "error.main", fontWeight: 600, fontSize: 13.5 }}>{error}</Typography>}
                <Typography component="div" sx={{ fontSize: 13.5, color: "text.secondary" }}>
                    Didn't get a code?{" "}
                    <Button
                        variant="text"
                        size="small"
                        disabled={time !== 0}
                        onClick={resend}
                        sx={{ minWidth: 0, p: "2px 6px", fontSize: 13.5, fontWeight: 600, textTransform: "none", verticalAlign: "baseline" }}
                    >
                        Resend{time !== 0 ? ` (${time}s)` : ""}
                    </Button>
                </Typography>
                <Divider flexItem sx={{ my: 0.5 }} />
                <Typography sx={{ fontSize: 14 }}><BackLink>Back to Log in</BackLink></Typography>
            </Stack>
        </Box>
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

        const errors = Validator.passwordReset(data, commonPasswordList)
        setErrorNewPassword(errors.new_password)
        setErrorPassword(errors.password_confirmation)
        if (Validator.hasErrors(errors)) return

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
        <Box>
            <Heading
                title="Reset Your Password"
                desc="Verified! Enter your new password below."
            />

            <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 3 }}>
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

                <Box sx={ACTIONS}>
                    <FormButton label="Save Changes" type="submit" enable={!reload} loading={reload} />
                </Box>
            </Box>

            <Typography sx={{ mt: 3, textAlign: "center", fontSize: 14 }}><BackLink>Back to Log in</BackLink></Typography>
        </Box>
    )
}

PasswordRecovery.layout = (page) => <GuestLayout>{page}</GuestLayout>

export default PasswordRecovery
