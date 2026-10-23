import EditProfileModal from "@/Components/modal/submission-form/edit-profile-modal"
import AccountSettingsForm from "@/Components/other/account-settings-form"
import { change, getProfilePic, showOutputModal, showWarningModal, splitStr } from "@/others/function";
import { Head, useForm } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { useReload } from "@/context-provider/reload-provider";
import { ProfileService } from "@/others/services/profile-service";
import { FormCache, accountSetupCacheKey } from "@/others/classes/form-cache";
import AuthLayout from "@/Layouts/auth-layout";
import SetupLayout, { StepHeading } from "@/Layouts/setup-layout";
import { ADDRESS_DEFAULTS, PROFILE_DEFAULTS } from "@/others/profile-defaults";
import { UserRound } from "lucide-react";


// Short, stable hash of a JSON-able value (djb2).
const fingerprint = (value) => {
    const str = JSON.stringify(value ?? null);
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return String(h >>> 0);
};

const StudentEditProfileForm = (props) => {
    const PROFILE_CACHE_KEY = accountSetupCacheKey("account-setup-profile", props.otherUserProfile.id);

    const address = (address, t) => {
        if (address != null) {
            switch (t) {
                case "place":
                    return (address[0] != 'place') ? address[0] : '';
                case "city":
                    return (address[1] != 'city') ? address[1] : '';
                case "province":
                    return (address[2] != 'province') ? address[2] : '';
                case "zipcode":
                    return (address[3] != 'zipcode') ? address[3] : '';
                default:
                    return address;
            }
        }
        return null;
    };

    const otherProfile = props.otherUserProfile.profile ?? {};
    const currentAddrss = splitStr(
                        otherProfile.current_address
                );

    const permanentAddrss = splitStr(
                        otherProfile.permanent_address
                );

    const uniqueAttByRole = {
        student: { program: props.otherUserProfile.program, enrollments: props.otherUserProfile.enrollments },
        teaching_staff: props.otherUserProfile.teaching_staff,
        parent: props.otherUserProfile.parent,
    };

    const profileData = {
        user_id: props.otherUserProfile.id,
        new_user_id: props.otherUserProfile.id,
        first_name: otherProfile.first_name,
        middle_name: otherProfile.middle_name,
        last_name: otherProfile.last_name,

        username: props.otherUserProfile.username,
        user_type: props.otherUserProfile.role,
        sex: otherProfile.sex,
        date_of_birth: otherProfile.date_of_birth,
        profile_picture: otherProfile.profile_picture,
        civil_status: otherProfile.civil_status,
        religion: otherProfile.religion || PROFILE_DEFAULTS.religion,
        citizenship: otherProfile.citizenship || PROFILE_DEFAULTS.citizenship,
        unique_att: uniqueAttByRole[props.otherUserProfile.role] ?? null,

        current_address: otherProfile.current_address,
        current_place: address(currentAddrss, "place"),
        current_city: address(currentAddrss, "city") || ADDRESS_DEFAULTS.city,
        current_province: address(currentAddrss, "province") || ADDRESS_DEFAULTS.province,
        current_zipcode: address(currentAddrss, "zipcode") || ADDRESS_DEFAULTS.zipcode,

        permanent_address: otherProfile.permanent_address,
        permanent_place: address(permanentAddrss, "place"),
        permanent_city: address(permanentAddrss, "city") || ADDRESS_DEFAULTS.city,
        permanent_province: address(permanentAddrss, "province") || ADDRESS_DEFAULTS.province,
        permanent_zipcode: address(permanentAddrss, "zipcode") || ADDRESS_DEFAULTS.zipcode,

        place_of_birth: otherProfile.place_of_birth,

        email: props.otherUserProfile.email,
        phone_number: otherProfile.contact_number,
        educationBackground: props.education_background,

        allow_complaint: props.otherUserProfile.permissions?.allow_complaint,
        allow_referral: props.otherUserProfile.permissions?.allow_referral,
        allow_absent_form: props.otherUserProfile.permissions?.allow_absent_form,
        allow_appointment: props.otherUserProfile.permissions?.allow_appointment,
        allow_gatepass: props.otherUserProfile.permissions?.allow_gatepass
    }

    const isForceSetup = !!props.force_account_setup;
    // A draft only applies to the profile it was typed over. Each draft is
    // stored with a fingerprint of the server data; if that data changed
    // since (re-seeded database, an admin edit, a reused user id), the
    // stale draft is dropped instead of overwriting the fresh values.
    const DRAFT_BASE_KEY = accountSetupCacheKey("account-setup-profile-base", props.otherUserProfile.id);
    const draftBase = fingerprint({ profile: otherProfile, education: props.education_background, username: props.otherUserProfile.username });
    const [cachedDraft] = useState(() => {
        if (!isForceSetup) return null;
        const draft = FormCache.load(PROFILE_CACHE_KEY);
        if (draft && FormCache.load(DRAFT_BASE_KEY)?.v !== draftBase) {
            FormCache.clear(PROFILE_CACHE_KEY);
            return null;
        }
        return draft;
    });

    // A cached draft restores whatever the user had typed (address, contact
    // number, etc.) — but identity/role fields must always come from the
    // fresh server data, never from the draft, or a draft saved under a
    // different role mid-testing (or before this cache was scoped per
    // account) would silently reclassify the account being edited.
    const { data, setData, post, processing, errors } = useForm(
        cachedDraft
            ? {
                ...profileData,
                ...Object.fromEntries(Object.entries(cachedDraft).filter(([, v]) => v !== "" && v !== null && v !== undefined)),
                user_id: profileData.user_id,
                new_user_id: profileData.new_user_id,
                user_type: profileData.user_type,
                username: profileData.username,
            }
            : profileData
    );

    // Autosave a draft while setup is forced, so an accidentally closed tab
    // doesn't lose unsaved input — nothing is sent to the backend from this
    // page until the password step is also filled in (AccountSetupController).
    useEffect(() => {
        if (!isForceSetup) return;
        const t = setTimeout(() => {
            FormCache.save(DRAFT_BASE_KEY, { v: draftBase });
            FormCache.save(PROFILE_CACHE_KEY, data);
        }, 600);
        return () => clearTimeout(t);
    }, [isForceSetup, data]);

    const [clickedOk, setClickOk] = useState(false);

    const [updatedData, setUpdatedData] = useState({})

    const { loadRegister } = useReload();
    const handleChange = (e) => {
        change(e, setData);
    };
    const handleProfileChange = (e) => {
        setData((prev) => ({
            ...prev, profile_picture: e
        }))
    }
    const user = props.otherUserProfile,
          profilePic = getProfilePic(user.profile?.profile_picture, user.profile?.sex);

    const openAccessTokenModal = (data) => {
        updateProfile(data)
    }

    // Check if the logged-in user is editing someone else's profile
    const isEditingOtherUser = props.auth.user.id != profileData.user_id;

    // Helper label for messages
    const nameLabel = isEditingOtherUser ? `${profileData.first_name} ${profileData.last_name}'s` : "Your";

    const updateProfile = (data) => {
        if (isForceSetup) {
            // Don't hit the backend yet — cache the completed step and move
            // on to the password step, where both are saved together.
            FormCache.save(PROFILE_CACHE_KEY, data).then((saved) => {
                if (!saved) {
                    showOutputModal(
                        "Failed to save your profile information on this device (it may be low on storage — a large profile picture can trigger this). Please try again, or try without changing your profile picture.",
                        "e",
                        () => {}
                    );
                    return;
                }
                // Same page, same load — just swap which form is shown.
                // Nothing is sent to the backend until the password step's
                // own submit (AccountSetupController::complete).
                props.setSetupStep?.('password');
            });
            return;
        }

        showWarningModal(
            `Are you sure you want to update ${nameLabel} profile information?`,
            "Update Profile",
            "Cancel",
            () => {
                loadRegister(
                    true,
                    "text-wait",
                    `${nameLabel} profile information is updating`
                );

                ProfileService.updateProfile(profileData.username, data, success, error);
            }
        );
    };

    const success = () => {
        showOutputModal(
            `${nameLabel} profile updated successfully!`,
            "s",
            () => {
                loadRegister(false);
                window.location.href = `/profile/${profileData.username}`;
            }
        );
    };

    const error = () => {
        showOutputModal(
            `Failed to update ${nameLabel} profile. Please try again.`,
            "e",
            () => {
                loadRegister(false);
            }
        );
    };

    if (isForceSetup && props.setupStep === 'password') {
        return (
            <AccountSettingsForm
                user={props.auth.user}
                targetAccount={props.otherUserProfile}
                reload={loadRegister}
                forceAccountSetup={true}
                onBackToProfile={() => props.setSetupStep?.('profile')}
            />
        );
    }

    return (
        <>
            <Head title={isForceSetup ? "Account Setup" : "Edit Profile"} />
            <div className={isForceSetup ? "" : "py-5"}>
                <div className={isForceSetup ? "bg-white py-6 px-5 sm:px-8 shadow-sm shadow-black/10 rounded-xl" : "bg-white py-5 px-10 shadow-md rounded-md"}>
                    <EditProfileModal.Body
                        user={props.auth.user}
                        data={data}
                        profilePic={profilePic}
                        change={handleChange}
                        setData={setData}
                        username={user.username}
                        profileChange={handleProfileChange}
                        reload={loadRegister}
                        setUpdate={setUpdatedData}
                        openAccessTokenModal={openAccessTokenModal}
                        program={props.program}
                        submitLabel={isForceSetup ? "Continue to Password Setup" : "Save Changes"}
                        heading={isForceSetup ? (
                            <StepHeading
                                icon={UserRound}
                                title="Complete Your Profile"
                                desc="Check the details below and fill in anything missing. You can change these later from your profile."
                            />
                        ) : undefined}
                    />
                </div>
            </div>
        </>
    )
}

StudentEditProfileForm.layout = (page) =>
    page.props.force_account_setup
        ? <SetupLayout user={page.props.user}>{page}</SetupLayout>
        : <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default StudentEditProfileForm