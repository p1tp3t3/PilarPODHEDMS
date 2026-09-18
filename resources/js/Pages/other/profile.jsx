import ProfilePic from "@/Components/other/profile-pic";
import React, { useEffect, useState, useContext } from "react";
import { Link, useForm } from "@inertiajs/react";
import DropdownField from "@/Components/input/dropdown";
import { splitStr, showOutputModal, change, getProfilePic, checkActiveStatus, readableActiveDuration, showWarningModal, canViewEnrollmentHistory } from "@/others/function";
import AuthContext from "@/context-provider/auth-provider";
import EditProfileModal from "@/Components/modal/submission-form/edit-profile-modal";
import { useReload } from "@/context-provider/reload-provider";
import { ProfileService } from "@/others/services/profile-service";
import About from "./profile/about";
import Incident from "./profile/incident";
import EnrollmentHistory from "./profile/enrollment-history";
import ComplaintList from "@/Components/list/complaint-list";
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal";
import ReferralList from "@/Components/list/referral-list";
import ViewReferralModal from "@/Components/modal/view/view-referral-modal";
import AbsentFormRequestList from "@/Components/list/absent-form-request-list";
import ViewAbsentFormModal from "@/Components/modal/view/view-absent-form-modal";
import GatePassRequestList from "@/Components/list/gatepass-request-list";
import ViewGatePassModal from "@/Components/modal/view/view-gatepass-modal";
import AuthLayout from "@/Layouts/auth-layout";
import TabSwitcher from "@/Components/other/tab-switcher";
import { motion } from "framer-motion";
import { User as UserIcon, ShieldAlert, GraduationCap, FileWarning, FileText, CalendarX, DoorOpen, UserPen, Settings } from "lucide-react";

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
          [updatedData, setUpdatedData] = useState({}),
          [viewComplaint, openViewComplaint] = useState(false),
          [viewComplaintId, setViewComplaintId] = useState(''),
          [complaintStatus, setComplaintStatus] = useState('all'),
          [viewReferral, openViewReferral] = useState(false),
          [viewReferralId, setViewReferralId] = useState(''),
          [viewAbsentForm, openViewAbsentForm] = useState(false),
          [viewAbsentFormId, setViewAbsentFormId] = useState(''),
          [viewGatepass, openViewGatepass] = useState(false),
          [viewGatepassId, setViewGatepassId] = useState('');

    const complaintStatusOptions = [
        { val: 'all', label: 'All Complaints' },
        { val: 'pending', label: 'Pending' },
        { val: 'ongoing', label: 'Ongoing' },
        { val: 'resolved', label: 'Resolved' },
        { val: 'rejected', label: 'Rejected' },
        { val: 'revoked', label: 'Revoked' },
    ];

    // One shared School Year + Semester filter, above the tab bar, applying
    // to whichever "filed" tab is active — purely client-side (the backend
    // already loaded everything once), matched against each row's
    // school_year_semester.school_year.year/.semester (whichever semester
    // was active when it was submitted). Options are the union of every
    // school year actually present across all four lists, not a fixed
    // global list, since a person's records may only ever span a couple.
    const semesterFilterOptions = [
        { val: 1, label: '1st Semester' },
        { val: 2, label: '2nd Semester' },
    ];
    const matchesSchoolYearSemester = (r, schoolYear, semester) => {
        if (schoolYear !== 'all' && r.school_year_semester?.school_year?.year !== schoolYear) return false
        if (semester !== 'all' && String(r.school_year_semester?.semester) !== String(semester)) return false
        return true
    };
    const [filterSchoolYear, setFilterSchoolYear] = useState('all');
    const [filterSemester, setFilterSemester] = useState('all');
    const schoolYearFilterOptions = (props.school_years ?? []).map((sy) => ({ val: sy.year, label: sy.year }));

    // The backend loads every one of this person's complaints once — the
    // status dropdown filters that in-memory list rather than reloading.
    const filteredComplaintsFiled = {
        data: (props.complaints_filed?.data ?? []).filter(
            (c) => (complaintStatus === 'all' || c.complaint_status === complaintStatus) &&
                   matchesSchoolYearSemester(c, filterSchoolYear, filterSemester)
        ),
    };

    // Referral/Absence/GatePass don't carry one unified status column —
    // each is derived the same way its own list component (referral-list.jsx,
    // absent-form-request-list.jsx, gatepass-request-list.jsx) already infers
    // it from timestamps, so the filter dropdown here matches what the row
    // itself displays.
    const [referralStatus, setReferralStatus] = useState('all');
    const referralStatusOptions = [
        { val: 'all', label: 'All Referrals' },
        { val: 'pending', label: 'Pending' },
        { val: 'confirmed', label: 'Confirmed' },
        { val: 'rejected', label: 'Rejected' },
        { val: 'revoked', label: 'Revoked' },
    ];
    const referralStatusFor = (r) => {
        if (r.revoked_at) return 'revoked'
        if (r.rejected_at) return 'rejected'
        if (r.confirmed_at) return 'confirmed'
        return 'pending'
    };
    const filteredReferralsFiled = (props.referrals_filed?.data ?? []).filter(
        (r) => (referralStatus === 'all' || referralStatusFor(r) === referralStatus) &&
               matchesSchoolYearSemester(r, filterSchoolYear, filterSemester)
    );

    const [absentFormStatus, setAbsentFormStatus] = useState('all');
    const absentFormStatusOptions = [
        { val: 'all', label: 'All Absent Forms' },
        { val: 'pending', label: 'Pending' },
        { val: 'noted', label: 'Noted' },
        { val: 'rejected', label: 'Rejected' },
        { val: 'revoked', label: 'Revoked' },
        { val: 'expired', label: 'Expired' },
    ];
    const absentFormStatusFor = (a) => {
        if (a.revoked_at) return 'revoked'
        if (a.rejected_at) return 'rejected'
        if (a.confirmed_at) return 'noted'
        if (new Date(a.date_to) < new Date()) return 'expired'
        return 'pending'
    };
    const filteredAbsentFormsFiled = (props.absent_forms_filed ?? []).filter(
        (a) => (absentFormStatus === 'all' || absentFormStatusFor(a) === absentFormStatus) &&
               matchesSchoolYearSemester(a, filterSchoolYear, filterSemester)
    );

    const [gatepassStatus, setGatepassStatus] = useState('all');
    const gatepassStatusOptions = [
        { val: 'all', label: 'All Gate Passes' },
        { val: 'pending', label: 'Pending' },
        { val: 'approved', label: 'Approved' },
        { val: 'rejected', label: 'Rejected' },
        { val: 'revoked', label: 'Revoked' },
    ];
    const gatepassStatusFor = (g) => {
        if (g.revoked_at) return 'revoked'
        if (g.rejected_at) return 'rejected'
        if (g.confirmed_at) return 'approved'
        return 'pending'
    };
    const filteredGatepassRequested = (props.gatepass_requested ?? []).filter(
        (g) => (gatepassStatus === 'all' || gatepassStatusFor(g) === gatepassStatus) &&
               matchesSchoolYearSemester(g, filterSchoolYear, filterSemester)
    );

    const otherProfile = props.otherUserProfile.profile ?? {};
    const currentAddrss = splitStr(otherProfile.current_address);
    const permanentAddrss = splitStr(otherProfile.permanent_address);

    const uniqueAttByRole = {
        student: { program: props.otherUserProfile.program, enrollments: props.otherUserProfile.enrollments },
        teaching_staff: props.otherUserProfile.teaching_staff,
        non_teaching_staff: props.otherUserProfile.non_teaching_staff,
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
            case "complaints_filed":
                return (
                    <div className="w-full bg-white shadow shadow-black/20 px-4 sm:px-6 md:px-10 py-6 grid gap-4 min-w-0">
                        <div className="w-full sm:w-56">
                            <DropdownField
                                default={{ val: 'all', label: 'All Complaints' }}
                                list={complaintStatusOptions.filter((o) => o.val !== 'all')}
                                val={complaintStatus}
                                onChange={(e) => setComplaintStatus(e.target.value)}
                                name="complaint_status_filter"
                            />
                        </div>
                        <div className="w-full">
                            <ComplaintList
                                type="viewer"
                                user={props.user}
                                list={filteredComplaintsFiled}
                                setId={(id) => { setViewComplaintId(id); openViewComplaint(true); }}
                                actionEvent={() => {}}
                            />
                        </div>
                    </div>
                );
            case "referrals_filed":
                return (
                    <div className="w-full bg-white shadow shadow-black/20 px-4 sm:px-6 md:px-10 py-6 grid gap-4 min-w-0">
                        <div className="w-full sm:w-56">
                            <DropdownField
                                default={{ val: 'all', label: 'All Referrals' }}
                                list={referralStatusOptions.filter((o) => o.val !== 'all')}
                                val={referralStatus}
                                onChange={(e) => setReferralStatus(e.target.value)}
                                name="referral_status_filter"
                            />
                        </div>
                        <ReferralList
                            type="viewer"
                            list={filteredReferralsFiled}
                            viewReferral={(id) => { setViewReferralId(id); openViewReferral(true); }}
                            events={() => {}}
                        />
                    </div>
                );
            case "absent_forms_filed":
                return (
                    <div className="w-full bg-white shadow shadow-black/20 px-4 sm:px-6 md:px-10 py-6 grid gap-4 min-w-0">
                        <div className="w-full sm:w-56">
                            <DropdownField
                                default={{ val: 'all', label: 'All Absent Forms' }}
                                list={absentFormStatusOptions.filter((o) => o.val !== 'all')}
                                val={absentFormStatus}
                                onChange={(e) => setAbsentFormStatus(e.target.value)}
                                name="absent_form_status_filter"
                            />
                        </div>
                        <AbsentFormRequestList
                            list={filteredAbsentFormsFiled}
                            events={(id, action) => {
                                if (!action || action === "view") { setViewAbsentFormId(id); openViewAbsentForm(true); }
                            }}
                        />
                    </div>
                );
            case "gatepass_requested":
                return (
                    <div className="w-full bg-white shadow shadow-black/20 px-4 sm:px-6 md:px-10 py-6 grid gap-4 min-w-0">
                        <div className="w-full sm:w-56">
                            <DropdownField
                                default={{ val: 'all', label: 'All Gate Passes' }}
                                list={gatepassStatusOptions.filter((o) => o.val !== 'all')}
                                val={gatepassStatus}
                                onChange={(e) => setGatepassStatus(e.target.value)}
                                name="gatepass_status_filter"
                            />
                        </div>
                        <GatePassRequestList
                            list={filteredGatepassRequested}
                            view={(id) => { setViewGatepassId(id); openViewGatepass(true); }}
                            events={() => {}}
                        />
                    </div>
                );
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
    // Incidents/violations are restricted to the prefect, the student's
    // program head (not just any faculty), and the student's parent — not
    // the system admin, and not a plain (non-program-head) faculty member.
    const isProgramHead = props.user.teachingStaff?.position === 'program_head';
    const showIncidentsTab = props.otherUserProfile.role === 'student' &&
        (props.user.role === 'sub_admin' || props.user.role === 'parent' || isProgramHead);
    // Complaints a person has filed (as complainant) aren't role-specific —
    // any role can file one, so every profile gets this tab. Referrals/
    // absent forms/gate passes are each only filed by one specific role,
    // so those tabs are further scoped to that role's own profile, and
    // stay reviewable by super_admin/sub_admin or by the person themselves.
    const canViewOwnFilings = ['super_admin', 'sub_admin'].includes(props.user.role) || props.user.id === props.otherUserProfile.id;
    // Complaint content itself is private from super_admin (data privacy)
    // — only the sub_admin (prefect) who actually handles it, or the
    // person who filed it, can view it.
    const canViewOwnComplaints = props.user.role === 'sub_admin' || props.user.id === props.otherUserProfile.id;
    const showComplaintsFiledTab = canViewOwnComplaints;
    const showReferralsFiledTab = props.otherUserProfile.role === 'teaching_staff' && canViewOwnFilings;
    const showAbsentFormsFiledTab = props.otherUserProfile.role === 'student' && canViewOwnFilings;
    const showGatepassRequestedTab = props.otherUserProfile.role === 'student' && canViewOwnFilings;

    const tabOptions = [
        { key: 'about', label: 'About', icon: UserIcon },
        ...(showIncidentsTab ? [{ key: 'incidents', label: 'Incidents and Violations', icon: ShieldAlert }] : []),
        ...(showEnrollmentHistoryTab ? [{ key: 'enrollment_history', label: 'Enrollment History', icon: GraduationCap }] : []),
        ...(showComplaintsFiledTab ? [{ key: 'complaints_filed', label: 'Complaints Filed', icon: FileWarning }] : []),
        ...(showAbsentFormsFiledTab ? [{ key: 'absent_forms_filed', label: 'Absent Forms Filed', icon: CalendarX }] : []),
        ...(showGatepassRequestedTab ? [{ key: 'gatepass_requested', label: 'Gatepass Requested', icon: DoorOpen }] : []),
        ...(showReferralsFiledTab ? [{ key: 'referrals_filed', label: 'Referral Filed', icon: FileText }] : []),
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

            {showComplaintsFiledTab &&
            <ViewComplaintModal
                close={viewComplaint}
                closeModal={openViewComplaint}
                pd={['px-10', 'py-7']}
                isEnableOuterClose={true}
                complainant={viewComplaintId}
                usr={props.user}
            />}

            {showReferralsFiledTab &&
            <ViewReferralModal
                close={viewReferral}
                closeModal={openViewReferral}
                pd={['px-10', 'py-7']}
                isEnableOuterClose={true}
                referralId={viewReferralId}
                usr={props.user}
            />}

            {showAbsentFormsFiledTab &&
            <ViewAbsentFormModal
                close={viewAbsentForm}
                closeModal={openViewAbsentForm}
                pd={['px-10', 'py-7']}
                isEnableOuterClose={true}
                id={viewAbsentFormId}
            />}

            {showGatepassRequestedTab &&
            <ViewGatePassModal
                close={viewGatepass}
                closeModal={openViewGatepass}
                pd={['px-10', 'py-7']}
                isEnableOuterClose={true}
                id={viewGatepassId}
                approved={false}
                setApprove={() => {}}
                events={() => {}}
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
                                            {user.role === "super_admin" && " (IT Admin)"}
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
                          (props.user.role == 'student' && props.otherUserProfile.role != 'parent') ||
                          showComplaintsFiledTab ||
                          showReferralsFiledTab ||
                          showAbsentFormsFiledTab ||
                          showGatepassRequestedTab) && (
                            <div className="w-full bg-white shadow-black/20 shadow-md border-t border-gray-300 px-4 sm:px-6 md:px-10 flex flex-wrap items-center justify-between gap-3 py-2">
                                <div className="min-w-0">
                                    <TabSwitcher tabs={tabOptions} value={tab} onChange={setTab} />
                                </div>
                                <div className="flex flex-wrap gap-3 shrink-0">
                                    <div className="w-full sm:w-48">
                                        <DropdownField
                                            default={{ val: 'all', label: 'All School Years' }}
                                            list={schoolYearFilterOptions}
                                            val={filterSchoolYear}
                                            onChange={(e) => setFilterSchoolYear(e.target.value)}
                                            name="filter_school_year"
                                        />
                                    </div>
                                    <div className="w-full sm:w-48">
                                        <DropdownField
                                            default={{ val: 'all', label: 'All Semesters' }}
                                            list={semesterFilterOptions}
                                            val={filterSemester}
                                            onChange={(e) => setFilterSemester(e.target.value)}
                                            name="filter_semester"
                                        />
                                    </div>
                                </div>
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
                                <UserPen size={16} />
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
                            <UserPen size={16} />
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
                        <Settings size={16} />
                        Account Settings
                    </motion.button>
                </Link>
            )}
        </div>
    );
};


export default Profile;
