import { useState } from "react";
import AuthLayout from "@/Layouts/auth-layout";
import PageLayout from "@/Layouts/page-layout";
import FormTextfield from "@/Components/input/form-input";
import FormButton from "@/Components/button/button";
import { SystemService } from "@/others/services/system-service";
import { change, readableDate, showOutputModal, showWarningModal } from "@/others/function";
import TabSwitcher from "@/Components/other/tab-switcher";
import { useReload } from "@/context-provider/reload-provider";
import { Head } from "@inertiajs/react";
import { Validator } from "@/others/classes/validator";
import RichTextEditor from "@/Components/input/rich-text-editor";
import ParentTermsModal from "@/Components/modal/parent-terms-modal";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Eye } from "lucide-react";

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
                            { key: "terms", label: "Terms and Conditions" },
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

                        {activeTab === "terms" && (
                            <TermsTab terms={props.terms} reload={loadRegister} />
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

        const found = Validator.loginPortalPassword(data);
        setError(Validator.asServerErrors(found));
        if (Validator.hasErrors(found)) return;

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

        const found = Validator.mailConfig(data);
        setError(Validator.asServerErrors(found));
        if (Validator.hasErrors(found)) return;

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
        const emailError = Validator.testEmail(testEmail);
        setTestError(emailError);
        if (emailError) return;

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

// The parent/guardian Terms and Conditions (shown on parent registration).
// Each save is a new version; parents registering afterwards agree to it.
const TermsTab = ({ terms: initial, reload }) => {
    const [terms, setTerms] = useState(initial);
    const [content, setContent] = useState(initial?.content ?? "");
    const [error, setError] = useState("");
    const [preview, setPreview] = useState(false);
    const dirty = content !== (terms?.content ?? "");

    const plainText = (html) => {
        const el = document.createElement("div");
        el.innerHTML = html ?? "";
        return (el.textContent ?? "").trim();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!plainText(content)) {
            setError("The Terms and Conditions cannot be empty.");
            return;
        }

        showWarningModal(
            "Save these Terms and Conditions? Parents who register from now on will agree to this version.",
            "Save Terms and Conditions",
            "Cancel",
            () => {
                reload(true, "text-wait", "Saving terms and conditions...");
                SystemService.saveTerms(
                    content,
                    (res) => {
                        if (res?.terms) {
                            setTerms(res.terms);
                            setContent(res.terms.content);
                        }
                        setError("");
                        reload(true, "success", "Terms and Conditions Saved Successfully");
                    },
                    (err) => {
                        reload(false);
                        const msg = err?.response?.data?.errors?.content?.[0] || err?.response?.data?.message;
                        if (msg) setError(msg);
                        else showOutputModal("Failed to Save Terms and Conditions", "e");
                    }
                );
            }
        );
    };

    return (
        <Box sx={{ maxWidth: "52rem" }}>
            <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" }, gap: 1.5, mb: 2.5 }}>
                    <Box>
                        <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600 }}>Terms and Conditions</Typography>
                        <Typography sx={{ fontSize: 13.5, color: "text.secondary", mt: 0.5 }}>
                            Shown to parents/guardians on the registration form. They must agree to it before registering.
                        </Typography>
                        <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.75 }}>
                            {terms?.is_default
                                ? "Using the default text (not edited yet)."
                                : <>Last updated {readableDate(terms?.updated_at)}{terms?.updated_by ? ` by ${terms.updated_by}` : ""}.</>}
                        </Typography>
                    </Box>
                    <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        color="inherit"
                        startIcon={<Eye size={15} />}
                        onClick={() => setPreview(true)}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, borderColor: "divider", color: "text.secondary", flexShrink: 0, alignSelf: { xs: "flex-start", sm: "auto" } }}
                    >
                        Preview
                    </Button>
                </Stack>

                <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2.5 }}>
                    <RichTextEditor
                        val={content}
                        change={(v) => { setContent(v); setError(""); }}
                        error={error}
                        placeholder="Write the terms and conditions…"
                        minHeight="24rem"
                    />
                    <Stack direction={{ xs: "column-reverse", sm: "row" }} sx={{ justifyContent: "flex-end", alignItems: { sm: "center" }, gap: 1.5 }}>
                        {dirty && (
                            <Button
                                type="button"
                                color="inherit"
                                onClick={() => { setContent(terms?.content ?? ""); setError(""); }}
                                sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary" }}
                            >
                                Discard Changes
                            </Button>
                        )}
                        <FormButton type="submit" label="Save Terms and Conditions" enable={dirty} />
                    </Stack>
                </Box>
            </Paper>

            {/* What parents see (the unsaved text, too). */}
            <ParentTermsModal
                open={preview}
                onClose={() => setPreview(false)}
                terms={{ ...terms, content }}
            />
        </Box>
    );
};

SystemSettings.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default SystemSettings;
