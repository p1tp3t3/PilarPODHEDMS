import { Head, usePage } from "@inertiajs/react"
import SetupLayout from "@/Layouts/setup-layout"
import { PasswordForm } from "@/Components/other/account-settings-form"
import { useReload } from "@/context-provider/reload-provider"

// Shown after login when the super admin changed this user's password
// (AccountSetupController::forcePassword): every other page is blocked
// until a new password is set.
const ForcePassword = () => {
    const { props } = usePage()
    const { loadRegister: reload } = useReload()

    return (
        <>
            <Head title="Set a New Password" />
            <PasswordForm
                authUser={{ ...props.auth.user, email: props.user.email }}
                targetAccount={props.targetAccount}
                isAdmin={false}
                isEditingOwnAccount={true}
                reload={reload}
                isForcePassword={true}
            />
        </>
    )
}

ForcePassword.layout = (page) => <SetupLayout user={page.props.user} passwordOnly>{page}</SetupLayout>

export default ForcePassword
