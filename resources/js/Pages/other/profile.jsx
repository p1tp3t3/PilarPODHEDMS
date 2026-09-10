import ProfilePic from "@/Components/other/profile-pic";
import React, { useEffect, useState, useContext } from "react";
import { Link, useForm } from "@inertiajs/react";
import { splitStr, showOutputModal, change, getProfilePic, checkActiveStatus, readableActiveDuration, showWarningModal, canViewEnrollmentHistory } from "@/others/function";
import AuthContext from "@/context-provider/auth-provider";
import EditProfileModal from "@/Components/modal/submission-form/edit-profile-modal";
import { useReload } from "@/context-provider/reload-provider";
import { ProfileService } from "@/others/services/profile-service";
import About from "./profile/about";
import Incident from "./profile/incident";
import EnrollmentHistory from "./profile/enrollment-history";
import AuthLayout from "@/Layouts/auth-layout";
import TabSwitcher from "@/Components/other/tab-switcher";
import { motion } from "framer-motion";
import { User as UserIcon, ShieldAlert, GraduationCap } from "lucide-react";

const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
};

const Profile = (props) => {
    const { isUserOnline } = useContext(AuthContext);

    const address = (address, t) => {
        if (address != null) {
            switch (t) {
                case "place": return address[0];
                case "city": return address[1];
                case "province": return address[2];
                case "zipcode": return address[3];
                default: return address;
            }
        }
        return null;
    };

    const [tab, setTab] = useState('about'),
          [updatedData, setUpdatedData] = useState({});

    const otherProfile = props.otherUserProfile.profile ?? {};
    const currentAddrss = splitStr(otherProfile.current_address);
    const permanentAddrss = splitStr(otherProfile.permanent_address);

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
        age: calculateAge(otherProfile.date_of_birth),
        date_of_birth: otherProfile.date_of_birth,
        profile_picture: otherProfile.profile_picture,
        civil_status: otherProfile.civil_status,
        religion: otherProfile.religion,
        unique_att: uniqueAttByRole[props.otherUserProfile.role] ?? null,
        current_address: otherProfile.current_address,
        current_place: address(currentAddrss, "place"),
        current_city: address(currentAddrss, "city"),
        current_province: address(currentAddrss, "province"),
        current_zipcode: address(currentAddrss, "zipcode"),
        citizenship: otherProfile.citizenship,
        permanent_address: otherProfile.permanent_address,
        permanent_place: address(permanentAddrss, "place"),
        permanent_city: address(permanentAddrss, "city"),
        permanent_province: address(permanentAddrss, "province"),
        permanent_zipcode: address(permanentAddrss, "zipcode"),
        place_of_birth: otherProfile.place_of_birth,
        email: props.otherUserProfile.email,
        phone_number: otherProfile.contact_number,
        allow_complaint: props.otherUserProfile.permissions?.allow_complaint,
        allow_referral: props.otherUserProfile.permissions?.allow_referral,
        allow_absent_form: props.otherUserProfile.permissions?.allow_absent_form,
        allow_appointment: props.otherUserProfile.permissions?.allow_appointment,
        allow_gatepass: props.otherUserProfile.permissions?.allow_gatepass
    };

    const { data, setData, post, processing, errors } = useForm(profileData);
    const [close, closeEditProfile] = useState(false),
          [clickedOk, setClickOk] = useState(false);

    const acc = props.user,
          user = props.otherUserProfile,
          profilePic = getProfilePic(user.profile?.profile_picture, user.profile?.sex);

    const { loadRegister } = useReload();
    const handleChange = (e) => change(e, setData);
    const handleProfileChange = (e) => setData(prev => ({ ...prev, profile_picture: e }));

    const isProfileFieldEmpty = () => (
        props.user.profile?.profile_picture == null &&
        props.user.profile?.current_address == 'place,city,province,zipcode' &&
        props.user.profile?.permanent_address == 'place,city,province,zipcode'
    );

    const openAccessTokenModal = (data) => updateProfile(data);
    const hasFamily = (profileData.user_type == 'student' || profileData.user_type == 'parent');
    const family = hasFamily ? props.family : [];
    const educationBackground = (profileData.user_type == 'student') ? props.education_background : [];

    const handleTab = (t) => {
        switch (t) {
            case "about":
                return (
                    <About
                        user={props.user}
                        data={profileData}
                        data2={data}
                        setData={setData}
                        family={family}
                        educationBackground={educationBackground}
                    />
                );
            case "incidents":
                return (
                    <Incident
                        data={props.otherUserProfile}
                        incidentGroups={props.incident_groups}
                        violationOccurrences={props.violation_occurrences}
                    />
                );
            case "enrollment_history":
                return <EnrollmentHistory enrollments={props.otherUserProfile.enrollments ?? []} />;
            default:
                return <About data={profileData} data2={data} setData={setData} />;
        }
    };

    const canEditProfile = () => {
        // Admin can edit all profiles
        if (acc.role === 'super_admin') return true;

        // Prefect can edit student profiles
        if (acc.role === 'sub_admin' && user.role === 'student') return true;

        // User editing own profile
        return acc.id === user.id;
    };

    const canEditAccount = () => {
        // ONLY admin (super admin) can edit accounts
        return acc.role === 'super_admin';
    };




    const isAllowToEdit = () => user.id != acc.id;

    const showEnrollmentHistoryTab = canViewEnrollmentHistory(props.user) && props.otherUserProfile.role === 'student';

    const tabOptions = [
        { key: 'about', label: 'About', icon: UserIcon },
        { key: 'incidents', label: 'Incidents and Violations', icon: ShieldAlert },
        ...(showEnrollmentHistoryTab ? [{ key: 'enrollment_history', label: 'Enrollment History', icon: GraduationCap }] : []),
    ];

    const updateProfile = (data) => {
        showWarningModal(
            `Are You Sure You Want To Update ${(isAllowToEdit() ? `${profileData.first_name}'s` : 'Your')} Profile Information?`,
            'Update Profile',
            'Cancel',
            () => {
                loadRegister(true, "text-wait", `${(isAllowToEdit() ? `${profileData.first_name}'s` : 'Your')} Profile Information Is Updating`);
                ProfileService.updateProfile(user.username, data, success, error);
            }
        );
    };

    const success = () => {
        showOutputModal(
            `${(isAllowToEdit() ? `${profileData.first_name}'s` : 'Your')} Profile Updated Successfully`,
            "s",
            () => {
                loadRegister(false);
                closeEditProfile(false);
                window.location.href = `/profile/${profileData.username}`;
            }
        )
    };
    const error = () => {
        showOutputModal(
            `Failed to Update ${(isAllowToEdit() ? `${profileData.first_name}'s` : 'Your')} Profile. Please Try Again`,
            "e",
            () => {
                loadRegister(false);
            }
        )
    };

    return (
        <>
            {(canEditProfile() && user.role != 'student') &&
            <EditProfileModal
                profilePic={profilePic}
                close={close}
                closeModal={closeEditProfile}
                data={data}
                user={props.user}
                reload={loadRegister}
                change={handleChange}
                profileChange={handleProfileChange}
                username={user.username}
                setData={setData}
                openAccessTokenModal={openAccessTokenModal}
                setUpdatedData={setUpdatedData}
                program={props.program}
            />}

                <div className="w-full grid gap-5 py-5">
                    <div className="">
                        {/* ✅ Responsive container */}
                        <div className="px-4 sm:px-6 md:px-10 bg-white shadow-md shadow-black/20">
                            <div className="py-6 md:py-10 flex flex-col md:flex-row justify-between items-center md:items-start gap-6">

                                {/* Left Side: Profile Picture + Name */}
                                <div className="flex flex-col sm:flex-row gap-6 md:gap-10 items-center md:items-start text-center md:text-left">
                                    <ProfilePic
                                        size={11}
                                        src={profilePic}
                                        showActive={user.id !== acc.id}
                                        activeSize={3}
                                        activeBorderColor="border-white border-[7px]"
                                        isActive={isUserOnline(user.id) || checkActiveStatus(user.last_seen)}
                                    />

                                    <div className="flex flex-col gap-1 md:gap-3">
                                        <h1 className="text-[1.7em] sm:text-[2em] font-bold">
                                            {`${user.profile?.first_name ?? ""} ${user.profile?.middle_name ?? ""} ${user.profile?.last_name ?? ""}`}
                                            {user.role === "super_admin" && " (System Admin)"}
                                        </h1>
                                        <p className="text-[1.1em] sm:text-[1.3em] text-gray-700">
                                            #{user.id_number}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side: Buttons */}
                                <div className="flex justify-center self-end md:justify-end w-full md:w-auto">
                                    <EditProfileAccountBtn
                                        user={user}
                                        acc={acc}
                                        closeEditProfile={closeEditProfile}
                                        close={close}
                                        canEditProfile={canEditProfile()}
                                        canEditAccount={canEditAccount()}
                                    />
                                </div>
                            </div>
                        </div>


                        {/* ✅ Responsive tabs */}
        {((props.user.role == "super_admin" && props.otherUserProfile.role == 'student') ||
                          (props.user.role == "sub_admin" && props.otherUserProfile.role == 'student') ||
                          ((props.user.role == "parent" && props.otherUserProfile.role == 'student')) ||
                          (props.user.role == "teaching_staff" && props.otherUserProfile.role == 'student')  ||
                          (props.user.role == 'student' && props.otherUserProfile.role != 'parent')) && (
                            <div className="w-full bg-white shadow-black/20 shadow-md border-t border-gray-300 px-4 sm:px-6 md:px-10">
                                <TabSwitcher tabs={tabOptions} value={tab} onChange={setTab} />
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    {handleTab(tab)}
                </div>
        </>
    );
}

Profile.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>


const EditProfileAccountBtn = ({
    user,
    acc,
    closeEditProfile,
    close,
    canEditProfile,
    canEditAccount
}) => {
    return (
        <div className="flex bg-gray-100 p-2 rounded-full w-fit items-center gap-3 shadow-inner">

            {/* ----------------- Edit Profile Button ----------------- */}
            {canEditProfile && (
                <>
                    {user.role === "student" ? (
                        <Link href={`/profile/${user.username}/edit`}>
                            <button
                                className="flex items-center gap-2 px-5 py-2.5
                                           rounded-full bg-green-600 text-white font-medium
                                           shadow-md hover:bg-green-700 transition-all"
                            >
                                <i className="fa-solid fa-user-pen"></i>
                                Edit Profile
                            </button>
                        </Link>
                    ) : (
                        <button
                            onClick={() => closeEditProfile(!close)}
                            className="flex items-center gap-2 px-5 py-2.5
                                       rounded-full bg-green-600 text-white font-medium
                                       shadow-md hover:bg-green-700 transition-all"
                        >
                            <i className="fa-solid fa-user-pen"></i>
                            Edit Profile
                        </button>
                    )}
                </>
            )}

            {/* ----------------- Account Settings Button ----------------- */}
            {(canEditAccount && (acc.role != 'super_admin' || user.role != 'super_admin')) && (
                <Link href={`/settings/${user.username}`}>
                    <motion.button
                        className="flex items-center gap-2 px-5 py-2.5
                                   rounded-full bg-white text-gray-700 font-medium
                                   border border-gray-300 shadow-md
                                   hover:bg-gray-200 hover:shadow-lg"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <i className="fa-solid fa-gear"></i>
                        Account Settings
                    </motion.button>
                </Link>
            )}
        </div>
    );
};


export default Profile;
