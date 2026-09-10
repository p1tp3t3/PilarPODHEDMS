import GuestLayout from "@/Layouts/guest-layout"
import FormTextfield from "@/Components/input/form-input"
import { change, showWarningModal, showOutputModal } from "@/others/function"
import FormButton from "@/Components/button/button"
import { PasswordRecoveryService } from "@/others/services/password-recovery-service"
import { useEffect, useState } from "react"
import { Link } from "@inertiajs/react"
import { Lock, ShieldAlert } from "lucide-react"

const ResetPassword = (props) => {
    const [data, setData] = useState({
        new_password: "",
        password_confirmation: "",
    })

    const [error_password, setErrorPassword] = useState("")
    const [error_new_password, setErrorNewPassword] = useState("")
    const [commonPasswordList, setCommonPasswordList] = useState([])
    const [reload, setReload] = useState(false)

    useEffect(() => {
        fetch("/storage/list/common-password.txt")
            .then((res) => res.text())
            .then((text) => {
                const lines = text.split(/\r?\n/).filter(Boolean)
                setCommonPasswordList(new Set(lines))
            })
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
                PasswordRecoveryService.reset(props.username, data.new_password, success, failed)
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

    if (!props.valid) {
        return (
            <div className="flex justify-center items-center bg-gradient-to-br">
                <div className="w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-xl p-6 text-center grid gap-4">
                    <ShieldAlert className="mx-auto text-red-600" size={56} />
                    <h1 className="text-2xl font-bold text-gray-800">Link Invalid or Expired</h1>
                    <p className="text-sm text-gray-600">
                        This password reset link is no longer valid. Please request a new one.
                    </p>
                    <Link href="/forgot-password" className="text-blue-600 hover:underline font-medium">
                        Request a new link
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex justify-center items-center bg-gradient-to-br">
            <div className="bg-white w-[90%] sm:w-[28rem] rounded-lg shadow-lg border border-gray-200">
                <div className="px-6 sm:px-10 py-7 grid gap-8">
                    <div className="grid gap-2 text-center sm:text-left">
                        <h1 className="text-2xl font-bold text-gray-800">
                            Reset Your Password
                        </h1>
                        <p className="text-sm text-gray-600 leading-snug">
                            Please enter your new password below.
                        </p>
                    </div>

                    <form method="post" onSubmit={handleSubmit} className="grid gap-6">
                        <div className="grid gap-5">
                            <FormTextfield
                                label="New Password"
                                type="password"
                                name="new_password"
                                id="new_password"
                                val={data.new_password}
                                error={error_new_password}
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
                                error={error_password}
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
            </div>
        </div>
    )
}

ResetPassword.layout = (page) => <GuestLayout>{page}</GuestLayout>

export default ResetPassword
