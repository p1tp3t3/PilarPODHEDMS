import { useState } from "react";
import AuthLayout from "@/Layouts/auth-layout";
import PageLayout from "@/Layouts/page-layout";
import FormTextfield from "@/Components/input/form-input";
import FormButton from "@/Components/button/button";
import AccountSettingsForm from "@/Components/other/account-settings-form";
import { SystemService } from "@/others/services/system-service";
import { change, showOutputModal } from "@/others/function";
import TabSwitcher from "@/Components/other/tab-switcher";
import { useReload } from "@/context-provider/reload-provider";
import { Head } from "@inertiajs/react";
import { validateForm, hasErrors, required, requiredIf, minLength, maxLength, email } from "@/others/validation";

const SystemSettings = (props) => {
    const [activeTab, setActiveTab] = useState("login_portal");
    const { loadRegister } = useReload();

    return (
        <>
            <Head title="System Settings" />
            <PageLayout title="System Settings">
                    {/* Tabs */}
                    <TabSwitcher
                        tabs={[
                            { key: "login_portal", label: "Super Admin Login Portal" },
                            { key: "mail", label: "Mail Configuration" },
                            { key: "account", label: "Account Settings" },
                        ]}
                        value={activeTab}
                        onChange={setActiveTab}
                    />

                    <div className="py-6 sm:py-10">
                        {activeTab === "login_portal" && (
                            <LoginPortalPasswordTab
                                hasPassword={props.has_login_portal_password}
                                reload={loadRegister}
                            />
                        )}

                        {activeTab === "mail" && (
                            <MailConfigTab
                                mailConfig={props.mail_config}
                                reload={loadRegister}
                            />
                        )}

                        {activeTab === "account" && (
                            <AccountSettingsForm
                                user={props.user}
                                targetAccount={props.user}
                                reload={loadRegister}
                            />
                        )}
                    </div>
            </PageLayout>
        </>
    );
};

const LoginPortalPasswordTab = ({ hasPassword, reload }) => {
    const [data, setData] = useState({ password: "", password_confirmation: "" });
    const [error, setError] = useState({});

    const handleSubmit = (e) => {
        e.preventDefault();

        const found = validateForm(data, {
            password: [required("Password"), minLength(8, "Password")],
            password_confirmation: [required("Password confirmation"), (v, d) => (v && v !== d.password ? "Passwords do not match." : null)],
        });
        setError(Object.fromEntries(Object.entries(found).filter(([k]) => !k.endsWith("Asterisk")).map(([k, v]) => [k, [v]])));
        if (hasErrors(found)) return;

        reload(true, "text-wait", "Updating login portal password...");

        SystemService.updateLoginPortalPassword(
            data,
            () => {
                reload(true, "success", "Login Portal Password Updated Successfully");
                setData({ password: "", password_confirmation: "" });
                setError({});
            },
            (err) => {
                reload(false);
                setError(err?.response?.data?.errors || {});
                if (err?.response?.data?.message && !err?.response?.data?.errors) {
                    showOutputModal(err.response.data.message, "e");
                }
            }
        );
    };

    return (
        <div className="max-w-[30rem]">
            <div className="bg-white rounded-md shadow-black/20 shadow-sm p-5 sm:p-8 grid gap-6">
                <div>
                    <p className="text-gray-700">
                        This password unlocks the super-admin-only login form at{" "}
                        <code className="bg-gray-100 px-1 rounded">/super-admin/login/&lt;password&gt;</code>{" "}
                        while the system is in maintenance mode.
                    </p>
                    <p className="text-[0.85em] text-gray-500 mt-2">
                        {hasPassword
                            ? "A login portal password is currently set."
                            : "No password has been set yet — the default from your environment configuration is in use."}
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="grid gap-5">
                    <FormTextfield
                        label="New Password"
                        name="password"
                        type="password"
                        val={data.password}
                        change={(e) => change(e, setData)}
                        enableShowPassword={true}
                        error={error.password?.[0]}
                    />
                    <FormTextfield
                        label="Confirm New Password"
                        name="password_confirmation"
                        type="password"
                        error={error.password_confirmation?.[0]}
                        val={data.password_confirmation}
                        change={(e) => change(e, setData)}
                        enableShowPassword={true}
                    />
                    <div className="grid justify-end">
                        <FormButton type="submit" label="Update Password" />
                    </div>
                </form>
            </div>
        </div>
    );
};

const MailConfigTab = ({ mailConfig, reload }) => {
    const [data, setData] = useState({
        username: mailConfig?.username || "",
        password: "",
    });
    const [testEmail, setTestEmail] = useState("");
    const [testError, setTestError] = useState("");
    const [error, setError] = useState({});

    const handleSubmit = (e) => {
        e.preventDefault();

        const found = validateForm(data, {
            username: [requiredIf((d) => !!d.password, "SMTP username"), maxLength(255, "SMTP username")],
            password: [maxLength(255, "SMTP password")],
        });
        setError(Object.fromEntries(Object.entries(found).filter(([k]) => !k.endsWith("Asterisk")).map(([k, v]) => [k, [v]])));
        if (hasErrors(found)) return;

        reload(true, "text-wait", "Saving mail configuration...");

        SystemService.saveMailConfig(
            data,
            () => {
                reload(true, "success", "Mail Configuration Saved Successfully");
                setData((prev) => ({ ...prev, password: "" }));
                setError({});
            },
            (err) => {
                reload(false);
                setError(err?.response?.data?.errors || {});
            }
        );
    };

    const handleSendTest = (e) => {
        e.preventDefault();
        const found = validateForm({ test_email: testEmail }, { test_email: [required("Email address"), email()] });
        setTestError(found.test_email ?? "");
        if (hasErrors(found)) return;

        reload(true, "text-wait", "Sending test email...");

        SystemService.sendTestEmail(
            testEmail,
            () => {
                reload(true, "success", "Test Email Sent Successfully. Please Check The Inbox.");
            },
            (err) => {
                reload(true, "error", err?.response?.data?.message || "Failed To Send Test Email");
            }
        );
    };

    return (
        <div className="max-w-[40rem] grid gap-8">
            <div className="bg-white rounded-md shadow-black/20 shadow-sm p-5 sm:p-8">
                <h2 className="text-lg font-semibold mb-1">SMTP Configuration</h2>
                <p className="text-[0.85em] text-gray-500 mb-5">
                    Host, port, encryption, and the from-address are fixed in the server's environment configuration.
                    Only the SMTP account credentials are editable here.
                </p>
                <form onSubmit={handleSubmit} className="grid gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <FormTextfield
                            label="SMTP Username"
                            name="username"
                            val={data.username}
                            change={(e) => change(e, setData)}
                            error={error.username?.[0]}
                        />
                        <FormTextfield
                            label="SMTP Password"
                            name="password"
                            type="password"
                            val={data.password}
                            change={(e) => change(e, setData)}
                            enableShowPassword={true}
                            error={error.password?.[0]}
                        />
                    </div>
                    <div className="grid justify-end">
                        <FormButton type="submit" label="Save Mail Configuration" />
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-md shadow-black/20 shadow-sm p-5 sm:p-8">
                <h2 className="text-lg font-semibold mb-2">Send Test Email</h2>
                <p className="text-[0.85em] text-gray-500 mb-5">
                    Send a test message using the mail configuration saved above to confirm it can actually deliver mail.
                </p>
                <form onSubmit={handleSendTest} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <div className="w-full sm:max-w-[20rem]">
                        <FormTextfield
                            label="Send To"
                            name="test_email"
                            val={testEmail}
                            change={(e) => { setTestEmail(e.target.value); setTestError(""); }}
                            error={testError}
                        />
                    </div>
                    <FormButton type="submit" label="Send Test Email" />
                </form>
            </div>
        </div>
    );
};

SystemSettings.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default SystemSettings;
