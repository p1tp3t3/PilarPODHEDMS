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
        <div className="w-full pb-5 grid gap-6 relative">
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
        </div>
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
        const err = {};

        if (!data.username?.trim()) {
            err.username = "Username is required";
            err.usernameAsterisk = true;
        } else if (data.username.length < 8) {
            err.username = "Username must be at least 8 characters long";
        } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(data.username)) {
            err.username = "Username must contain both letters and numbers";
        }

        if (isAdmin) {
            if (!data.email?.trim()) {
                err.email = "Email is required";
                err.emailAsterisk = true;
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
                err.email = "Please enter a valid email address";
            }
        }

        setError(err);
        return !err.username && !err.email;
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
        <div className="bg-white px-5 md:px-10 py-8 rounded-lg shadow-sm shadow-black/20">
            <h2 className="text-lg font-semibold mb-5">Username &amp; Email</h2>
            <form onSubmit={handleSubmit} className="grid gap-6">
                {/* Usernames and emails are managed by the IT admin; everyone else sees theirs. */}
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
                    <div className="grid justify-end">
                        <FormButton type="submit" label="Save Changes" />
                    </div>
                ) : (
                    <p className="text-[0.85em] text-gray-500">
                        To change your username or email, contact the IT admin.
                    </p>
                )}
            </form>
        </div>
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
        <div className="-mt-2 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {rules.map((r) => {
                    const ok = r.test(password);
                    return (
                        <li key={r.label} className={`flex items-center gap-2 text-[0.82em] ${ok ? "text-green-700" : "text-gray-500"}`}>
                            {ok ? <CircleCheck size={15} className="shrink-0" /> : <Circle size={15} className="shrink-0 text-gray-300" />}
                            {r.label}
                        </li>
                    );
                })}
            </ul>
            <p className="text-[0.78em] text-gray-500 mt-2.5">It also can't contain your name, username, ID number or email, or be a commonly used password.</p>
        </div>
    );
};

// lastname_idnumber, as default_password() in app/helpers.php.
const plain = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
const defaultPasswordOf = (account) => `${plain(account.profile?.last_name)}_${plain(account.id_number)}`;

// The IT admin on another user's account settings: no typed password, just a
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
        <div className="bg-white px-5 md:px-10 py-8 rounded-lg shadow-sm shadow-black/20">
            <h2 className="text-lg font-semibold mb-3">Password</h2>
            <p className="text-[0.9em] text-gray-600">
                Resets the password to the default, <b>lastname_IDnumber</b>
                {canReset && <> (<code className="font-semibold">{defaultPasswordOf(targetAccount)}</code>)</>}.
                {" "}{name} must change it at their next login.
            </p>
            {!canReset && (
                <p className="text-[0.85em] text-[#d12323] mt-2">This account has no ID number or last name, so it has no default password.</p>
            )}
            <div className="grid justify-end mt-5">
                <FormButton type="button" label="Reset Password" click={reset} enable={canReset} />
            </div>
        </div>
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
        const err = {};

        if (showCurrentPassword && !data.current_password) {
            err.current_password = "Current Password is required";
            err.current_passwordAsterisk = true;
        }

        if (!data.password) {
            err.password = "Password is required";
            err.passwordAsterisk = true;
        } else {
            const validator = new Validator({}, targetAccount.role);
            validator.validatePassword(
                {
                    ...data,
                    first_name: targetAccount.profile?.first_name,
                    middle_name: targetAccount.profile?.middle_name,
                    last_name: targetAccount.profile?.last_name,
                    username: targetAccount.username,
                    email: targetAccount.email,
                    // data.user_id (spread above) is targetAccount's numeric
                    // DB id, not a string — validatePassword expects the
                    // human-readable ID Number here (same meaning it has
                    // everywhere else in this Validator class), so it's
                    // overridden with the real id_number field.
                    user_id: targetAccount.id_number,
                },
                err,
                commonPasswordList
            );
            if (err.password) err.passwordAsterisk = true;
        }

        if (!data.password_confirmation) {
            err.password_confirmation = "Password Confirmation is required";
            err.password_confirmationAsterisk = true;
        }

        if (data.password && data.password_confirmation && data.password !== data.password_confirmation) {
            err.password = "Password doesn't match";
            err.passwordAsterisk = true;
        }

        setError(err);
        return !err.current_password && !err.password && !err.password_confirmation;
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

            <div className={isForceSetup || isForcePassword ? "bg-white px-5 sm:px-8 py-6 rounded-xl shadow-sm shadow-black/10" : "bg-white px-5 md:px-10 py-8 rounded-lg shadow-sm shadow-black/20"}>
                {isForcePassword ? (
                    <div className="mb-6">
                        <StepHeading
                            icon={KeyRound}
                            title="Set a New Password"
                            desc="The administrator reset your password to the default (lastname_IDnumber). Enter it, then choose your own."
                        />
                    </div>
                ) : isForceSetup ? (
                    <div className="mb-6">
                        <StepHeading
                            icon={KeyRound}
                            title="Set a New Password"
                            desc="Replace the default password your account was created with. You'll use this one to log in from now on."
                        />
                    </div>
                ) : (
                    <h2 className="text-lg font-semibold mb-5">Password</h2>
                )}
                <form onSubmit={handleSubmit} className="grid gap-6">
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

                    <div className="-mt-2">
                        <GeneratePassword
                            value={data.password}
                            onGenerate={(password) => setData((prev) => ({ ...prev, password, password_confirmation: password }))}
                        />
                    </div>

                    {(isForceSetup || isForcePassword) && <PasswordChecklist password={data.password} confirmation={data.password_confirmation} />}

                    {isForcePassword ? (
                        <div className="grid sm:justify-end pt-2">
                            <FormButton type="submit" label="Save New Password" />
                        </div>
                    ) : isForceSetup ? (
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { onBackToProfile?.(); window.scrollTo({ top: 0 }) }}
                                className="inline-flex items-center justify-center gap-1.5 text-[0.9em] font-semibold text-gray-600 hover:text-gray-900 px-3 py-2"
                            >
                                <ArrowLeft size={16} /> Back to Profile
                            </button>
                            <FormButton type="submit" label="Complete Account Setup" />
                        </div>
                    ) : (
                        <div className="grid justify-end">
                            <FormButton type="submit" label="Change Password" />
                        </div>
                    )}
                </form>
            </div>
        </>
    );
};

export default AccountSettingsForm;
