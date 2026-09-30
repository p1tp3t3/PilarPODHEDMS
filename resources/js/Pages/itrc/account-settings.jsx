import { replaceUnderScoreToSpace, toTitleCase } from "@/others/function"
import { useState } from "react";
import AuthLayout from "@/Layouts/auth-layout";
import SetupLayout from "@/Layouts/setup-layout";
import AccountSettingsForm from "@/Components/other/account-settings-form";
import { useReload } from "@/context-provider/reload-provider";

const UserAccountSettings = (props) => {
    const [tab, setTab] = useState("account_settings");
    const { loadRegister } = useReload();

    return (
        <>
            <div className="w-full md:w-[45rem] mx-auto py-4">
                <div className="w-full grid gap-5 relative">
                    <div className="flex flex-col sm:flex-row justify-between items-center">
                        <h1 className="text-[1.5em] font-bold pb-4">
                            {toTitleCase(replaceUnderScoreToSpace(tab))}
                        </h1>
                    </div>
                </div>

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
