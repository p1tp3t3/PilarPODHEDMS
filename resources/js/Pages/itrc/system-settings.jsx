import { useState } from "react";
import AuthLayout from "@/Layouts/auth-layout";
import FormTextfield from "@/Components/input/form-input";
import FormButton from "@/Components/button/button";
import AccountSettingsForm from "@/Components/other/account-settings-form";
import { SystemService } from "@/others/services/system-service";
import { change, showOutputModal } from "@/others/function";
import TabSwitcher from "@/Components/other/tab-switcher";
import { useReload } from "@/context-provider/reload-provider";

const SystemSettings = (props) => {
    const [activeTab, setActiveTab] = useState("login_portal");
    const { loadRegister } = useReload();

    return (
        <>
            <div className="grid gap-8">
                <div className="pt-6 sm:pt-10 grid w-full gap-3">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                        System Settings
                    </h1>

                    {/* Tabs */}
                    <TabSwitcher
                        tabs={[
                            { key: "system_name", label: "System Name" },
                            { key: "login_portal", label: "Super Admin Login Portal" },
                            { key: "mail", label: "Mail Configuration" },
                            { key: "archive_retention", label: "Archive Retention" },
                            { key: "account", label: "Account Settings" },
                        ]}
                        value={activeTab}
                        onChange={setActiveTab}
                    />

                    <div className="py-6 sm:py-10">
                        {activeTab === "system_name" && (
                            <SystemNameTab
                                appName={props.app_name}
                                reload={loadRegister}
                            />
                        )}

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

                        {activeTab === "archive_retention" && (
                            <ArchiveRetentionTab
                                retentionYears={props.archive_retention_years}
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
                </div>
            </div>
        </>
    );
};

const SystemNameTab = ({ appName, reload }) => {
    const [name, setName] = useState(appName || "");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("System name is required");
            return;
        }
        setError("");

        reload(true, "text-wait", "Updating system name...");

        SystemService.updateAppName(
            name,
            () => {
                reload(true, "success", "System Name Updated Successfully");
            },
            () => {
                reload(true, "error", "Failed to Update System Name");
            }
        );
    };

    return (
        <div className="max-w-[30rem]">
            <div className="bg-white rounded-md shadow-black/20 shadow-sm p-5 sm:p-8 grid gap-6">
                <p className="text-gray-700">
                    This is the system's branded name shown in the sidebar across the app.
                </p>
                <form onSubmit={handleSubmit} className="grid gap-5">
                    <FormTextfield
                        label="System Name"
                        name="app_name"
                        val={name}
                        change={(e) => setName(e.target.value)}
                        error={error}
                        errorAsterisk={!!error}
                    />
                    <div className="grid justify-end">
                        <FormButton type="submit" label="Save System Name" />
                    </div>
                </form>
            </div>
        </div>
    );
};

const ArchiveRetentionTab = ({ retentionYears, reload }) => {
    const [years, setYears] = useState(retentionYears ?? 5);
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        const parsed = parseInt(years, 10);
        if (!parsed || parsed < 1) {
            setError("Retention period must be at least 1 year");
            return;
        }
        setError("");

        reload(true, "text-wait", "Updating archive retention period...");

        SystemService.updateArchiveRetention(
            parsed,
            () => {
                reload(true, "success", "Archive Retention Period Updated Successfully");
            },
            () => {
                reload(true, "error", "Failed to Update Archive Retention Period");
            }
        );
    };

    return (
        <div className="max-w-[30rem]">
            <div className="bg-white rounded-md shadow-black/20 shadow-sm p-5 sm:p-8 grid gap-6">
                <p className="text-gray-700">
                    Archived incident documents (complaints, referrals, and absent forms)
                    must stay in the archive for this many years before they become eligible for permanent deletion.
                </p>
                <form onSubmit={handleSubmit} className="grid gap-5">
                    <FormTextfield
                        label="Retention Period (Years)"
                        name="retention_years"
                        type="number"
                        val={years}
                        change={(e) => setYears(e.target.value)}
                        error={error}
                        errorAsterisk={!!error}
                    />
                    <div className="grid justify-end">
                        <FormButton type="submit" label="Save Retention Period" />
                    </div>
                </form>
            </div>
        </div>
    );
};

const LoginPortalPasswordTab = ({ hasPassword, reload }) => {
    const [data, setData] = useState({ password: "", password_confirmation: "" });
    const [error, setError] = useState({});

    const handleSubmit = (e) => {
        e.preventDefault();

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
    const [error, setError] = useState({});

    const handleSubmit = (e) => {
        e.preventDefault();

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
        if (!testEmail) return;

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
                            change={(e) => setTestEmail(e.target.value)}
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
