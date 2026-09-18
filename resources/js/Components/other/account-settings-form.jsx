import FormButton from "@/Components/button/button";
import FormTextfield from "@/Components/input/form-input";
import OtpModal from "@/Components/modal/validation/show-otp-modal";
import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { change, checkUserExist, checkCurrentPassword, showOutputModal, showWarningModal } from "@/others/function";
import { AccountService } from "@/others/services/account-service";
import { Validator } from "@/others/classes/validator";
import { FormCache, accountSetupCacheKey } from "@/others/classes/form-cache";

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
    const [existUsername, setExistUsername] = useState(false);
    const [existEmail, setExistEmail] = useState(false);

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
        if (!validate()) return;

        const usernameChanged = data.username !== targetAccount.username;
        const emailChanged = data.email !== targetAccount.email;

        if ((existUsername && usernameChanged) || (existEmail && emailChanged)) return;

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
                    () => {
                        reload(true, "");
                        showOutputModal("Failed to Update Account Info", "e", () => reload(false));
                    }
                );
            }
        );
    };

    return (
        <div className="bg-white px-5 md:px-10 py-8 rounded-lg shadow-sm shadow-black/20">
            <h2 className="text-lg font-semibold mb-5">Username &amp; Email</h2>
            <form onSubmit={handleSubmit} className="grid gap-6">
                <FormTextfield
                    label="Username"
                    name="username"
                    val={data.username}
                    change={(e) => change(e, setData)}
                    checkExists={(e) => checkUserExist('username', e, data.user_id)}
                    setExist={setExistUsername}
                    error={error.username}
                    errorAsterisk={error.usernameAsterisk}
                />

                {isAdmin && (
                    <FormTextfield
                        label="Email"
                        name="email"
                        val={data.email}
                        change={(e) => change(e, setData)}
                        checkExists={(e) => checkUserExist('email', e, data.user_id)}
                        setExist={setExistEmail}
                        error={error.email}
                        errorAsterisk={error.emailAsterisk}
                    />
                )}

                <div className="grid justify-end">
                    <FormButton type="submit" label="Save Changes" />
                </div>
            </form>
        </div>
    );
};

const PasswordForm = ({ authUser, targetAccount, isAdmin, isEditingOwnAccount, reload, isForceSetup = false, onBackToProfile }) => {
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
            const isCorrect = await checkCurrentPassword(authUser.id, data.current_password);
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

        if (isForceSetup && !FormCache.load(PROFILE_CACHE_KEY)) {
            showOutputModal(
                "Please complete your profile information first.",
                "e",
                // Reached via the same page's step state (edit-profile-form.jsx)
                // in the real forced-setup flow — the route-based fallback only
                // matters if this component is ever reused somewhere that
                // doesn't pass onBackToProfile.
                () => onBackToProfile ? onBackToProfile() : router.visit(`/force-change/${targetAccount.username}`)
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
            {!isForceSetup && (
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

            <div className="bg-white px-5 md:px-10 py-8 rounded-lg shadow-sm shadow-black/20">
                <h2 className="text-lg font-semibold mb-5">Password</h2>
                <form onSubmit={handleSubmit} className="grid gap-6">
                    {showCurrentPassword && (
                        <FormTextfield
                            label="Enter Your Current Password"
                            name="current_password"
                            id="current_password"
                            type="password"
                            val={data.current_password}
                            change={(e) => change(e, setData)}
                            checkExists={(e) => checkCurrentPassword(authUser.id, e)}
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

                    <div className="grid justify-end">
                        <FormButton type="submit" label={isForceSetup ? "Complete Account Setup" : "Change Password"} />
                    </div>
                </form>
            </div>
        </>
    );
};

export default AccountSettingsForm;
