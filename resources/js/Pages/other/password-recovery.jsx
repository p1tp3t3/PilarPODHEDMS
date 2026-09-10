import GuestLayout from "@/Layouts/guest-layout"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { change } from "@/others/function"
import { PasswordRecoveryService } from "@/others/services/password-recovery-service"
import { useState } from "react"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { User, MailCheck } from "lucide-react"

const PasswordRecovery = () => {
    const [data, setData] = useState({ username: '' })
    const [usernameError, setError] = useState("")
    const [sent, setSent] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const handleChange = (e) => {
        change(e, setData)
        if (usernameError) setError("")
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const username = data.username.trim()

        if (!username) {
            setError("Username / User I.D is required")
            return
        }
        if (submitting) return

        setSubmitting(true)
        PasswordRecoveryService.sendLink(
            username,
            () => setSent(true),
            (err) => {
                setSubmitting(false)
                setError(err.response?.data?.message || "An error occurred")
            }
        )
    }

    return (
        <div className="flex justify-center items-center bg-gradient-to-br">
            <motion.div
                className="w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl"
                whileHover={{ scale: 1.01 }}
            >
                {sent ? (
                    <div className="text-center grid gap-4 py-4">
                        <MailCheck className="mx-auto text-green-600" size={56} />
                        <h1 className="text-2xl sm:text-3xl font-bold">Check Your Email</h1>
                        <p className="text-sm sm:text-base text-gray-600">
                            If an account matches that username, we've sent a password reset link to its
                            registered email address. The link expires in 60 minutes.
                        </p>
                        <Link href="/" className="text-blue-600 hover:underline font-medium">
                            Back to Log in
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 text-center">
                            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                                Forgot Your Password?
                            </h1>
                            <p className="text-sm sm:text-base leading-relaxed text-justify">
                                Enter your <b>Username</b> or <b>User I.D</b> below. We'll email a secure link
                                to your registered email address so you can reset your password.
                            </p>
                        </div>

                        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                            <FormTextfield
                                label="Username / User I.D"
                                type="text"
                                name="username"
                                id="username"
                                val={data.username}
                                error={usernameError}
                                errorAsterisk={usernameError !== ""}
                                icon={User}
                                change={handleChange}
                                req={true}
                            />

                            <div className="w-full flex justify-end">
                                <FormButton
                                    label="Send Reset Link"
                                    type="submit"
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
                    </>
                )}
            </motion.div>
        </div>
    )
}

PasswordRecovery.layout = (page) => <GuestLayout>{page}</GuestLayout>

export default PasswordRecovery
