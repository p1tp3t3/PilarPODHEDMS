import { replaceUnderScoreToSpace, toTitleCase } from "@/others/function"
import { useState } from "react";
import AuthLayout from "@/Layouts/auth-layout";
import SetupLayout from "@/Layouts/setup-layout";
import AccountSettingsForm from "@/Components/other/account-settings-form";
import { useReload } from "@/context-provider/reload-provider";
import { Head, router } from "@inertiajs/react";
import ChangeRoleModal from "@/Components/modal/submission-form/change-role-modal";
import { ShieldCheck } from "lucide-react";

const UserAccountSettings = (props) => {
    const [tab, setTab] = useState("account_settings");
    const [roleModal, openRoleModal] = useState(false);
    const { loadRegister } = useReload();
    const target = props.otherUserAccount?.data ?? props.otherUserAccount;
    // Only present when the IT admin is viewing someone else's settings.
    const canChangeRole = !!props.roles && !!target;
    const roleLabel = props.roles?.find((r) => r.name === target?.role)?.label ?? target?.role;

    return (
        <>
            <Head title="Account Settings" />
            <div className="w-full md:w-[45rem] mx-auto py-4">
                <div className="w-full grid gap-5 relative">
                    <div className="flex flex-col sm:flex-row justify-between items-center">
                        <h1 className="text-[1.5em] font-bold pb-4">
                            {toTitleCase(replaceUnderScoreToSpace(tab))}
                        </h1>
                    </div>
                </div>

                {canChangeRole && (
                    <>
                        <ChangeRoleModal
                            close={roleModal}
                            closeModal={openRoleModal}
                            user={target}
                            roles={props.roles}
                            programs={props.programs ?? []}
                            reload={loadRegister}
                            onChanged={() => router.reload({ only: ["otherUserAccount"] })}
                        />
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 grid place-items-center">
                                    <ShieldCheck size={20} />
                                </span>
                                <div>
                                    <div className="text-[0.75em] text-gray-500">Role</div>
                                    <div className="font-semibold text-gray-900">{roleLabel}</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => openRoleModal(true)}
                                className="rounded-full bg-indigo-600 px-4 py-2 text-[0.85em] font-medium text-white hover:bg-indigo-700"
                            >
                                Change Role
                            </button>
                        </div>
                    </>
                )}

                <AccountSettingsForm
                    user={props.auth.user}
                    targetAccount={props.otherUserAccount}
                    reload={loadRegister}
                    forceAccountSetup={props.force_account_setup}
                />
            </div>
        </>
    );
};

UserAccountSettings.layout = (page) =>
    page.props.force_account_setup
        ? <SetupLayout user={page.props.user}>{page}</SetupLayout>
        : <AuthLayout user={page.props.user} program={page.props.program_name}>{page}</AuthLayout>



export default UserAccountSettings
