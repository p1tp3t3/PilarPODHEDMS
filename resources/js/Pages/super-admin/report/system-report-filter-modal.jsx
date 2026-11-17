import { useState } from "react"
import axios from "axios"
import UpModal from "@/Components/modal/up-modal"
import FormButton from "@/Components/button/button"
import DropdownField from "@/Components/input/dropdown"
import FormTextfield from "@/Components/input/form-input"
import BetweenTextfield from "@/Components/input/between-input"
import RadioButton from "@/Components/input/radio"
import CheckBoxButton from "@/Components/input/checkbox"
import SearchUserBar from "@/Components/input/search-user-bar"
import SelectedUser from "@/Components/other/selected-user"
import { getProfilePic, showOutputModal } from "@/others/function"
import { reloadListData } from "@/others/hooks/use-list-data"
import { Validator } from "@/others/classes/validator"

// The super admin's New / Edit Report Filter form (Report Generator, shared
// component: @/Components/report-generator). A filter is one report type and
// its options; it's generated as a PDF or Excel by GenerateSystemReportJob.

const ROLES = [
    { val: "student", label: "Students" }, { val: "program_head", label: "Program Heads" }, { val: "faculty", label: "Faculty" },
    { val: "non_teaching_staff", label: "Non-Teaching Staff" }, { val: "parent", label: "Parents" }, { val: "sub_admin", label: "Prefect" },
]
const SEMESTERS = [{ val: "1", label: "1st Semester" }, { val: "2", label: "2nd Semester" }]
const EMPTY = {
    name: "", report_type: "account_statistics", filter_by: "date", date_from: "", date_to: "", school_year: "all", semester: "all",
    days: "30", role: "all", status: "all", issue: "all", action_type: "all",
    individual: false, student_id: "",
}
// Report types that can be about one person, and who can be picked.
const INDIVIDUAL = {
    account_activity: { label: "Individual User Report", search: "/api/all-users/all-2", plc: "Search User" },
    action_log: { label: "Individual User Report", search: "/api/all-users/all-2", plc: "Search User" },
    enrollment: { label: "Individual Student Report", search: "/api/all-users/family-student", plc: "Search Student" },
}
const errorMessage = (x, fallback) =>
    (x.response?.data?.errors && Object.values(x.response.data.errors)[0]?.[0]) ?? x.response?.data?.message ?? fallback

// Create / edit a report filter (the same form as the prefect's Create
// Report Filter). Its report type is fixed once saved.
const FilterModal = ({ close, closeModal, editing, reportTypes, schoolYears, actionTypes, reload }) => {
    const [form, setForm] = useState(EMPTY)
    const [err, setErr] = useState("")
    const [wasOpen, setWasOpen] = useState(false)
    // Individual report: the person picked (a search result, or the saved one).
    const [search, setSearch] = useState("")
    const [person, setPerson] = useState(null)
    if (close !== wasOpen) {
        setWasOpen(close)
        if (close) {
            const f = editing ? { ...EMPTY, ...editing.filters, name: editing.name, report_type: editing.report_type } : EMPTY
            setForm(f)
            setErr("")
            setSearch("")
            setPerson(f.individual && f.student_id
                ? [{ id: f.student_id, profile: { first_name: f.student_name ?? "Selected", last_name: "" } }]
                : null)
        }
    }
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
    const type = form.report_type
    const typeLabel = reportTypes.find((t) => t.val === type)?.label ?? ""
    // A dropdown whose first option names what it is ("All Roles", ...).
    const dropdown = (key, list, all) => (
        <DropdownField default={all ? { val: "all", label: all } : null} list={list} val={form[key]} onChange={set(key)} name={key} keepCase />
    )
    const dateRange = (
        <BetweenTextfield
            type="date"
            labels={["Date From", "Date To"]}
            name={["date_from", "date_to"]}
            id={["date_from", "date_to"]}
            data={[form.date_from, form.date_to]}
            setData={setForm}
        />
    )
    const schoolYearFields = (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dropdown("school_year", schoolYears.map((y) => ({ val: y, label: y })), "All School Years")}
            {dropdown("semester", SEMESTERS, "All Semesters")}
        </div>
    )

    const individual = INDIVIDUAL[type]
    const isIndividual = !!individual && !!form.individual
    const pickPerson = (_, user) => {
        setPerson([user])
        setSearch("")
        setForm((f) => ({ ...f, student_id: user.id }))
    }
    const individualFields = individual && (
        <div className="grid gap-2">
            <CheckBoxButton.CheckBox
                label={individual.label}
                id="sa_individual"
                name="individual"
                checked={form.individual}
                change={(e) => {
                    const on = e.target.checked
                    setForm((f) => ({ ...f, individual: on, ...(on ? {} : { student_id: "" }) }))
                    if (!on) setPerson(null)
                }}
            />
            {form.individual && (
                <div className="grid gap-2">
                    {!person && (
                        <div className="w-full relative">
                            <SearchUserBar
                                setSearch={setSearch}
                                name="sa_search_person"
                                search={search}
                                plc={individual.plc}
                                handleSearch={(e) => setSearch(e.target.value)}
                                lim={5}
                                def="User Not Found"
                                withLink={false}
                                click={pickPerson}
                                apiLink={individual.search}
                            />
                        </div>
                    )}
                    {person && (
                        <div>
                            <div className="text-[0.8em]">{type === "enrollment" ? "Student:" : "User:"}</div>
                            <SelectedUser
                                src={getProfilePic(person[0].profile?.profile_picture, person[0].profile?.sex)}
                                name={[person[0].profile?.first_name ?? "", person[0].profile?.last_name ?? ""]}
                                user={person[0]}
                                unselect={() => { setPerson(null); setForm((f) => ({ ...f, student_id: "" })) }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )

    const submit = (e) => {
        e.preventDefault()
        const filterError = Validator.reportFilter({
            needsPerson: isIndividual && !form.student_id,
            personLabel: type === "enrollment" ? "student" : "user",
            individualLabel: individual.label,
            date_from: form.date_from,
            date_to: form.date_to,
        })
        setErr(filterError)
        if (filterError) return
        reload(true, "text-wait", editing ? "Saving Filter" : "Creating Filter")
        const url = editing ? `/super-admin/report-filter/${editing.id}/update` : "/super-admin/report-filter/create"
        // No name: the report's name ("Account Activity Filter").
        axios.post(url, { ...form, individual: isIndividual, student_id: isIndividual ? form.student_id : "", name: form.name.trim() || `${typeLabel} Filter` })
            .then(() => {
                reload(true, "")
                showOutputModal(editing ? "Filter Saved" : "Filter Created", "s", () => { reload(false); closeModal(false); reloadListData() })
            })
            .catch((x) => { reload(true, ""); showOutputModal(errorMessage(x, "Failed to Save the Filter"), "e", () => reload(false)) })
    }

    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={close} pd={["px-10", "py-4"]} bgColor="bg-white" w="w-[30rem]">
            <div className="w-full grid gap-3">
                <div className="pt-3 text-[1.2em] text-center grid gap-1">
                    <h1><b>{editing ? "Edit Report Filter" : "Create Report Filter"}</b></h1>
                    {editing && <p className="text-[0.6em] text-gray-500">{typeLabel} Report</p>}
                </div>
                <div className="py-3 w-full">
                    <form onSubmit={submit} method="post">
                        <div className="grid gap-5">
                            <div>
                                <FormTextfield label="Filter Name (Optional)" name="name" id="sa_report_name" val={form.name} change={set("name")} />
                            </div>
                            {!editing &&
                            <div className="grid gap-1">
                                <label className="text-[0.85em] text-gray-700">Report Type</label>
                                {dropdown("report_type", reportTypes.map((t) => ({ val: t.val, label: `${t.label} Report` })), null)}
                            </div>}

                            {individualFields}

                            {type === "account_statistics" && <>
                                <div>
                                    <RadioButton
                                        list={[{ val: "date", label: "Date Range" }, { val: "school_year", label: "School Year" }]}
                                        id="sa_filter_by" name="filter_by" val={form.filter_by}
                                        change={(e) => setForm((f) => ({ ...f, filter_by: e.target.value, date_from: "", date_to: "", school_year: "all", semester: "all" }))}
                                    />
                                </div>
                                {form.filter_by === "date" ? <div>{dateRange}</div> : schoolYearFields}
                            </>}
                            {type === "account_activity" && <>
                                {dropdown("days", [{ val: "7", label: "Last 7 days" }, { val: "30", label: "Last 30 days" }, { val: "90", label: "Last 90 days" }, { val: "365", label: "Last 12 months" }], null)}
                                {!isIndividual && dropdown("role", ROLES, "All Roles")}
                                {!isIndividual && dropdown("status", [{ val: "active", label: "Active" }, { val: "inactive", label: "Inactive (30+ days)" }, { val: "never", label: "Never logged in" }], "All Statuses")}
                            </>}
                            {type === "account_setup" && <>
                                {dropdown("role", ROLES, "All Roles")}
                                {dropdown("issue", [{ val: "profile", label: "Profile not set up" }, { val: "password", label: "Must change password" }], "All Pending")}
                            </>}
                            {/* Individual enrollment: every term of the student. */}
                            {type === "enrollment" && !isIndividual && schoolYearFields}
                            {type === "action_log" && <>
                                {dropdown("action_type", actionTypes, "All Actions")}
                                <div>{dateRange}</div>
                            </>}

                            {err && <div className="text-red-600 text-[0.85em]">{err}</div>}
                            <div className="grid">
                                <FormButton type="submit" label={editing ? "Save Changes" : "Create Filter"} />
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </UpModal>
    )
}

export default FilterModal
