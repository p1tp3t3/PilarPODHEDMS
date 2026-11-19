import FormButton from "@/Components/button/button";
import FormTextfield from "@/Components/input/form-input";
import OtpModal from "@/Components/modal/validation/show-otp-modal";
import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { change, checkCurrentPassword, showOutputModal, showWarningModal } from "@/others/function";
import GeneratePassword from "@/Components/input/generate-password";
import { AccountService } from "@/others/services/account-service";
import { Validator } from "@/others/classes/validator";
import { FormCache, accountSetupCacheKey } from "@/others/classes/form-cache";
import { StepHeading } from "@/Layouts/setup-layout";
import { KeyRound, ArrowLeft, Circle, CircleCheck } from "lucide-react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

// One settings card (Username & Email, Password).
const SettingsCard = ({ title, compact = false, children }) => (
    <Paper
        variant="outlined"
        sx={{ px: { xs: 2.5, md: compact ? 4 : 5 }, py: compact ? 3 : 4, borderRadius: compact ? 3 : 2 }}
    >
        {title && <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600, mb: 2.5 }}>{title}</Typography>}
        {children}
    </Paper>
);

// The submit row: full width on phones, right-aligned otherwise.
const Actions = ({ children, sx }) => (
    <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" }, "& > button": { width: { xs: "100%", sm: "auto" } }, ...sx }}>{children}</Box>
);

/**
 * Username/email and password are two independent submissions (separate
 * forms, separate API calls) — changing one never touches the other.
 *
 * Exception: during forced first-login setup, the username/email form is
 * hidden and the password step is instead submitted together with the
 * profile step cached on the previous page (see AccountSetupController).
 */
const AccountSettingsForm = ({ user, targetAccount, reload, forceAccountSetup = false, onBackToProfile }) => {
    const isAdmin = user.role === "super_admin";
    const isEditingOwnAccount = targetAccount.id === user.id;
    const isForceSetup = forceAccountSetup && isEditingOwnAccount;

    return (
        <Box sx={{ width: "100%", pb: 2.5, display: "grid", gap: 3, position: "relative" }}>
            {!isForceSetup && (
                <AccountInfoForm
                    authUser={user}
                    targetAccount={targetAccount}
                    isAdmin={isAdmin}
                    reload={reload}
                />
            )}
            <PasswordForm
                authUser={user}
                targetAccount={targetAccount}
                isAdmin={isAdmin}
                isEditingOwnAccount={isEditingOwnAccount}
                reload={reload}
                isForceSetup={isForceSetup}
                onBackToProfile={onBackToProfile}
            />
        </Box>
    );
};

const AccountInfoForm = ({ authUser, targetAccount, isAdmin, reload }) => {
    const [data, setData] = useState({
        user_id: targetAccount.id,
        username: targetAccount.username,
        email: targetAccount.email,
    });
    const [error, setError] = useState({});

    const validate = () => {
        const err = Validator.accountInfo(data, isAdmin);
        setError(err);
        return !Validator.hasErrors(err);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isAdmin) return;
        if (!validate()) return;

        const isSelfUpdate = targetAccount.id === authUser.id;

        showWarningModal(
            isSelfUpdate
                ? "Are You Sure You Want To Update Your Username/Email?"
                : `Are You Sure You Want To Update ${targetAccount.profile?.first_name ?? "This User's"}'s Username/Email?`,
            "Update Account Info",
            "Cancel",
            () => {
                reload(true, "text-wait", "Updating account info...");

                const payload = { user_id: data.user_id, username: data.username };
                if (isAdmin) payload.email = data.email;

                AccountService.updateAccountInfo(
                    payload,
                    () => {
                        reload(true, "");
                        showOutputModal("Account Info Updated Successfully", "s", () => {
                            reload(false);
                            window.location.reload();
                        });
                    },
                    (e) => {
                        reload(true, "");
                        // e.g. "The username has already been taken."
                        showOutputModal(e?.response?.data?.message ?? "Failed to Update Account Info", "e", () => reload(false));
                    }
                );
            }
        );
    };

    return (
        <SettingsCard title="Username & Email">
            <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 3 }}>
                {/* Usernames and emails are managed by the System Admin; everyone else sees theirs. */}
                <FormTextfield
                    label="Username"
                    name="username"
                    val={data.username}
                    change={(e) => change(e, setData)}
                    readOnly={!isAdmin}
                    error={error.username}
                    errorAsterisk={error.usernameAsterisk}
                />

                <FormTextfield
                    label="Email"
                    name="email"
                    val={data.email ?? ""}
                    change={(e) => change(e, setData)}
                    readOnly={!isAdmin}
                    error={error.email}
                    errorAsterisk={error.emailAsterisk}
                />

                {isAdmin ? (
                    <Actions><FormButton type="submit" label="Save Changes" /></Actions>
                ) : (
                    <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>
                        To change your username or email, contact the System Admin.
                    </Typography>
                )}
            </Box>
        </SettingsCard>
    );
};

// Live view of the rules Validator.validatePassword() enforces, so the user
// sees what's missing while typing instead of one error at a time on submit.
const PASSWORD_RULES = [
    { label: "At least 8 characters", test: (p) => p.length >= 8 },
    { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
    { label: "A number", test: (p) => /[0-9]/.test(p) },
    { label: "A special character (!@#$%^&*_-+=<>?)", test: (p) => /[!@#$%^&*_\-+=<>?]/.test(p) },
];

const PasswordChecklist = ({ password = "", confirmation = "" }) => {
    const rules = [...PASSWORD_RULES, { label: "Both passwords match", test: (p) => p !== "" && p === confirmation }];
    return (
        <Paper variant="outlined" sx={{ mt: -1, px: 2, py: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 2, rowGap: 0.75 }}>
                {rules.map((r) => {
                    const ok = r.test(password);
                    return (
                        <Box component="li" key={r.label} sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, color: ok ? "success.main" : "text.secondary" }}>
                            {ok ? <CircleCheck size={15} style={{ flexShrink: 0 }} /> : <Circle size={15} style={{ flexShrink: 0, opacity: 0.4 }} />}
                            {r.label}
                        </Box>
                    );
                })}
            </Box>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 1.25 }}>It also can't contain your name, username, ID number or email, or be a commonly used password.</Typography>
        </Paper>
    );
};

// lastname_idnumber, as default_password() in app/helpers.php.
const plain = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
const defaultPasswordOf = (account) => `${plain(account.profile?.last_name)}_${plain(account.id_number)}`;

// The System Admin on another user's account settings: no typed password, just a
// reset to the default, which the user must change at their next login.
const ResetPasswordCard = ({ targetAccount, reload }) => {
    const name = targetAccount.profile?.first_name ?? "this user";
    const canReset = !!targetAccount.id_number && !!targetAccount.profile?.last_name;

    const reset = () => {
        showWarningModal(
            `Reset ${name}'s password to the default? They'll be signed out and must set a new one at their next login.`,
            "Reset Password",
            "Cancel",
            () => {
                reload(true, "text-wait", "Resetting password...");
                AccountService.resetPassword(
                    targetAccount.id,
                    () => {},
                    () => {
                        reload(true, "");
                        showOutputModal("Password Reset", "s", () => reload(false),
                            `<div>The password is now <b>${defaultPasswordOf(targetAccount)}</b>.</div><div style="font-size:0.9em;color:#555;margin-top:6px">${name} must change it at their next login.</div>`);
                    },
                    (e) => {
                        reload(true, "");
                        showOutputModal(e?.response?.data?.message ?? "Failed to Reset Password", "e", () => reload(false));
                    }
                );
            }
        );
    };

    return (
        <SettingsCard title="Password">
            <Typography sx={{ fontSize: 14.5, color: "text.secondary", mt: -1 }}>
                Resets the password to the default, <b>lastname_IDnumber</b>
                {canReset && <> (<Box component="code" sx={{ fontWeight: 600, color: "text.primary" }}>{defaultPasswordOf(targetAccount)}</Box>)</>}.
                {" "}{name} must change it at their next login.
            </Typography>
            {!canReset && (
                <Typography sx={{ fontSize: 13.5, color: "error.main", mt: 1 }}>This account has no ID number or last name, so it has no default password.</Typography>
            )}
            <Actions sx={{ mt: 2.5 }}>
                <FormButton type="button" label="Reset Password" click={reset} enable={canReset} />
            </Actions>
        </SettingsCard>
    );
};

export const PasswordForm = (props) => {
    const { targetAccount, isAdmin, isEditingOwnAccount, reload, isForceSetup = false, isForcePassword = false } = props;
    if (isAdmin && !isEditingOwnAccount && !isForceSetup && !isForcePassword) {
        return <ResetPasswordCard targetAccount={targetAccount} reload={reload} />;
    }
    return <OwnPasswordForm {...props} />;
};

const OwnPasswordForm = ({ authUser, targetAccount, isAdmin, isEditingOwnAccount, reload, isForceSetup = false, onBackToProfile, isForcePassword = false }) => {
    const PROFILE_CACHE_KEY = accountSetupCacheKey("account-setup-profile", targetAccount.id);
    const PASSWORD_CACHE_KEY = accountSetupCacheKey("account-setup-password", targetAccount.id);
    const [commonPasswordList, setCommonPasswordList] = useState([]);
    const cachedDraft = isForceSetup ? FormCache.load(PASSWORD_CACHE_KEY) : null;
    const [data, setData] = useState({
        user_id: targetAccount.id,
        current_password: "",
        password: "",
        password_confirmation: "",
        ...(cachedDraft || {}),
    });
    const [error, setError] = useState({});
    const [verifyPass, setVerifyCurrentPassword] = useState(false);
    const [otp, openOtp] = useState(false);

    useEffect(() => {
        fetch("/storage/list/common-password.txt")
            .then((res) => res.text())
            .then((text) => setCommonPasswordList(new Set(text.split(/\r?\n/).filter(Boolean))))
            .catch((x) => console.log(x));
    }, []);

    // Autosave a draft while setup is forced, so an accidentally closed tab
    // doesn't lose unsaved input.
    useEffect(() => {
        if (!isForceSetup) return;
        const t = setTimeout(() => FormCache.save(PASSWORD_CACHE_KEY, data), 600);
        return () => clearTimeout(t);
    }, [isForceSetup, data]);

    // Only the account owner needs to prove their current password;
    // an admin editing someone else's account doesn't have it to give.
    const showCurrentPassword = isEditingOwnAccount;

    const validate = () => {
        const err = Validator.accountPassword(data, { needsCurrent: showCurrentPassword, account: targetAccount, commonPasswordList });
        setError(err);
        return !Validator.hasErrors(err);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        if (showCurrentPassword) {
            const isCorrect = await checkCurrentPassword(authUser.encrypted_id, data.current_password);
            setVerifyCurrentPassword(isCorrect);
            if (!isCorrect) {
                setError((prev) => ({
                    ...prev,
                    current_password: "Wrong Password. Please Try Again.",
                    current_passwordAsterisk: true,
                }));
                return;
            }
        }

        if (isForcePassword) {
            submitForcedPassword();
            return;
        }

        if (isForceSetup && !FormCache.load(PROFILE_CACHE_KEY)) {
            showOutputModal(
                "Please complete your profile information first.",
                "e",
                // Reached via the same page's step state (edit-profile-form.jsx)
                // in the real forced-setup flow — the route-based fallback only
                // matters if this component is ever reused somewhere that
                // doesn't pass onBackToProfile.
                () => onBackToProfile ? onBackToProfile() : router.visit(`/force-change/${targetAccount.encrypted_id}`)
            );
            return;
        }

        // Forced setup already verified the user's email as its own first
        // step — an extra OTP re-verification here would be redundant. A
        // voluntary password change (not forced setup) still gets the OTP
        // confirmation as an extra safety check.
        if (isForceSetup) {
            submitPasswordChange();
        } else {
            openOtp(true);
        }
    };

    // Password changed by the super admin: set a new one, then continue.
    const submitForcedPassword = () => {
        reload(true, "text-wait", "Saving your new password...");
        AccountService.submitForcedPassword(
            data,
            () => {
                reload(true, "");
                showOutputModal("Password Updated Successfully", "s", () => {
                    reload(false);
                    window.location.href = "/dashboard";
                });
            },
            (e) => {
                reload(true, "");
                const err = e?.response?.data?.error || e?.response?.data?.message;
                showOutputModal(err || "Failed to Update Password", "e", () => reload(false));
            }
        );
    };

    const submitPasswordChange = () => {
        reload(true, "text-wait", isForceSetup ? "Completing account setup..." : "Updating password...");

        AccountService.submitPasswordChange(
            isForceSetup,
            isForceSetup ? { ...FormCache.load(PROFILE_CACHE_KEY), ...data } : data,
            () => {
                reload(true, "");

                if (isForceSetup) {
                    FormCache.clear(PROFILE_CACHE_KEY);
                    FormCache.clear(PASSWORD_CACHE_KEY);
                    FormCache.clear(accountSetupCacheKey("account-setup-profile-base", targetAccount.id));
                }

                showOutputModal(
                    isForceSetup ? "Account Setup Completed Successfully" : "Password Updated Successfully",
                    "s",
                    () => {
                        reload(false);
                        if (isForceSetup) {
                            window.location.href = "/dashboard";
                        } else {
                            window.location.reload();
                        }
                    }
                );
            },
            (e) => {
                reload(true, "");
                const err = e?.response?.data?.error || e?.response?.data?.message;
                showOutputModal(
                    err || (isForceSetup ? "Failed to Complete Account Setup" : "Failed to Update Password"),
                    "e",
                    () => reload(false)
                );
            }
        );
    };

    return (
        <>
            {!isForceSetup && !isForcePassword && (
                <OtpModal
                    close={otp}
                    isEnableOuterClose={false}
                    closeModal={openOtp}
                    username={authUser.username}
                    contact={{
                        email: authUser.email,
                        contact_number: authUser.contact_number,
                    }}
                    proceedEvent={() => {
                        openOtp(false);
                        submitPasswordChange();
                    }}
                    generatedPin={otp ? Math.floor(Math.random() * 900000) + 100000 : 0}
                />
            )}

            <SettingsCard compact={isForceSetup || isForcePassword} title={isForceSetup || isForcePassword ? null : "Password"}>
                {isForcePassword ? (
                    <Box sx={{ mb: 3 }}>
                        <StepHeading
                            icon={KeyRound}
                            title="Set a New Password"
                            desc="The administrator reset your password to the default (lastname_IDnumber). Enter it, then choose your own."
                        />
                    </Box>
                ) : isForceSetup ? (
                    <Box sx={{ mb: 3 }}>
                        <StepHeading
                            icon={KeyRound}
                            title="Set a New Password"
                            desc="Replace the default password your account was created with. You'll use this one to log in from now on."
                        />
                    </Box>
                ) : null}
                <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 3 }}>
                    {showCurrentPassword && (
                        <FormTextfield
                            label={isForcePassword ? "Default Password (lastname_IDnumber)" : "Enter Your Current Password"}
                            name="current_password"
                            id="current_password"
                            type="password"
                            val={data.current_password}
                            change={(e) => change(e, setData)}
                            checkExists={(e) => checkCurrentPassword(authUser.encrypted_id, e)}
                            enableShowPassword={true}
                            setExist={setVerifyCurrentPassword}
                            error={error.current_password}
                            errorAsterisk={error.current_passwordAsterisk}
                        />
                    )}

                    <FormTextfield
                        label="Enter New Password"
                        name="password"
                        id="password"
                        type="password"
                        val={data.password}
                        change={(e) => change(e, setData)}
                        enableShowPassword={true}
                        error={error.password}
                        errorAsterisk={error.passwordAsterisk}
                    />


                    <FormTextfield
                        label="Confirm New Password"
                        name="password_confirmation"
                        id="password_confirmation"
                        type="password"
                        val={data.password_confirmation}
                        change={(e) => change(e, setData)}
                        enableShowPassword={true}
                        error={error.password_confirmation}
                        errorAsterisk={error.password_confirmationAsterisk}
                    />

                    <Box sx={{ mt: -1 }}>
                        <GeneratePassword
                            value={data.password}
                            onGenerate={(password) => setData((prev) => ({ ...prev, password, password_confirmation: password }))}
                        />
                    </Box>

                    {(isForceSetup || isForcePassword) && <PasswordChecklist password={data.password} confirmation={data.password_confirmation} />}

                    {isForcePassword ? (
                        <Actions sx={{ pt: 1 }}><FormButton type="submit" label="Save New Password" /></Actions>
                    ) : isForceSetup ? (
                        <Stack direction={{ xs: "column-reverse", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 1.5, pt: 1 }}>
                            <Button
                                type="button"
                                color="inherit"
                                startIcon={<ArrowLeft size={16} />}
                                onClick={() => { onBackToProfile?.(); window.scrollTo({ top: 0 }) }}
                                sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary" }}
                            >
                                Back to Profile
                            </Button>
                            <FormButton type="submit" label="Complete Account Setup" />
                        </Stack>
                    ) : (
                        <Actions><FormButton type="submit" label="Change Password" /></Actions>
                    )}
                </Box>
            </SettingsCard>
        </>
    );
};

export default AccountSettingsForm;
