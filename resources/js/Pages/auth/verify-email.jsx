import SetupLayout from "@/Layouts/setup-layout"
import { useState } from "react"
import { Head } from "@inertiajs/react"
import FormButton from "@/Components/button/button"
import { AuthService } from "@/others/services/auth-service"
import { showOutputModal } from "@/others/function"
import { MailCheck } from "lucide-react"

const VerifyEmail = ({ email }) => {
    const [sending, setSending] = useState(false)

    const resend = () => {
        setSending(true)
        AuthService.resendVerificationEmail(
            () => {
                setSending(false)
                showOutputModal("Verification link sent. Please check your inbox.", "s")
            },
            () => {
                setSending(false)
                showOutputModal("Failed to send verification link. Please try again.", "e")
            }
        )
    }

    return (
        <>
            <Head title="Verify Your Email" />
            <div className="bg-white px-5 md:px-10 py-10 rounded-xl shadow-sm shadow-black/10 grid gap-5 justify-items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#00379c]/10 text-[#00379c] ring-8 ring-[#00379c]/5 grid place-items-center text-[1.8em]">
                    <MailCheck size="1em" />
                </div>
                <div>
                    <h1 className="text-[1.2em] font-bold">Verify Your Email</h1>
                    <p className="text-[0.9em] text-gray-600 mt-2 max-w-[28rem]">
                        We've sent a verification link to <b>{email}</b>. Click the link in that email to continue setting up your account.
                    </p>
                </div>
                <FormButton type="button" click={resend} loading={sending} label="Resend Verification Email" />
            </div>
        </>
    )
}

VerifyEmail.layout = (page) => <SetupLayout user={page.props.user}>{page}</SetupLayout>

export default VerifyEmail
