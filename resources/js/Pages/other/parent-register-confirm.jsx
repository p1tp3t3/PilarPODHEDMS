import GuestLayout from "@/Layouts/guest-layout"
import { Link } from "@inertiajs/react"
import { CheckCircle2, ShieldAlert } from "lucide-react"

const ParentRegisterConfirm = (props) => {
    return (
        <div className="flex justify-center items-center bg-gradient-to-br">
            <div className="w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-xl p-6 text-center grid gap-4">
                {props.success ? (
                    <CheckCircle2 className="mx-auto text-green-600" size={56} />
                ) : (
                    <ShieldAlert className="mx-auto text-red-600" size={56} />
                )}
                <h1 className="text-2xl font-bold text-gray-800">
                    {props.success ? "Registration Confirmed" : "Confirmation Failed"}
                </h1>
                <p className="text-sm text-gray-600">{props.message}</p>
                <Link href="/" className="text-blue-600 hover:underline font-medium">
                    Back to Log in
                </Link>
            </div>
        </div>
    )
}

ParentRegisterConfirm.layout = (page) => <GuestLayout>{page}</GuestLayout>

export default ParentRegisterConfirm
