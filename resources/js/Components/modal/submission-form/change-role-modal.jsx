import UpModal from "../up-modal"
import { useEffect, useState } from "react"
import DropdownField from "@/Components/input/dropdown"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import { AccountService } from "@/others/services/account-service"
import { formatSchoolYearSemester, readableDate, readableTime, showOutputModal, showWarningModal, toTitleCase } from "@/others/function"

const emptyDetails = { program_id: "", year_level: "", position: "", parent_role: "", work_occupation: "" }

const yearLevels = [1, 2, 3, 4, 5].map((y) => ({ val: y, label: `Year ${y}` }))
const parentRoles = [
    { val: "mother", label: "Mother" },
    { val: "father", label: "Father" },
    { val: "guardian", label: "Guardian" },
]
const positionLabel = (p) => (p === "program_head" ? "Program Head" : toTitleCase(p))

// What each role needs on record besides the role itself.
const requiredFields = {
    student: ["program_id", "year_level"],
    teaching_staff: ["program_id", "position"],
    non_teaching_staff: ["position"],
    parent: ["parent_role"],
}

const fieldLabels = {
    program_id: "Program",
    year_level: "Year level",
    position: "Position",
    parent_role: "Parent role",
}

const ChangeRoleModal = ({ close, closeModal, user, roles = [], programs = [], onChanged, reload }) => {
    const [role, setRole] = useState("")
    const [details, setDetails] = useState(emptyDetails)
    const [info, setInfo] = useState(null)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        if (!close || !user) return
        setRole("")
        setDetails(emptyDetails)
        setErrors({})
        setInfo(null)
        AccountService.getRoleHistory(user.encrypted_id, setInfo, () => setInfo({ history: [], existing: {}, positions: {} }))
    }, [close, user?.id])

    if (!user) return null

    const labelOf = (name) => roles.find((r) => r.name === name)?.label ?? name
    const name = `${user.profile?.first_name ?? ""} ${user.profile?.last_name ?? ""}`.trim() || user.username

    // Prefill from whatever this user already has on record for the role.
    const pickRole = (next) => {
        setRole(next)
        setErrors({})
        const existing = info?.existing?.[next] ?? {}
        setDetails({ ...emptyDetails, ...Object.fromEntries(Object.entries(existing).filter(([, v]) => v !== null)) })
    }

    const set = (field) => (e) => {
        const value = e.target.value
        setDetails((prev) => ({ ...prev, [field]: value }))
        setErrors((prev) => ({ ...prev, [field]: null }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const errs = {}
        if (!role) errs.role = "Please select the new role."
        for (const f of requiredFields[role] ?? []) {
            if (!details[f]) errs[f] = `${fieldLabels[f]} is required.`
        }
        setErrors(errs)
        if (Object.keys(errs).length) return

        const payload = { role, ...Object.fromEntries((requiredFields[role] ?? []).map((f) => [f, details[f]])) }
        if (role === "parent") payload.work_occupation = details.work_occupation

        showWarningModal(
            `Change ${name}'s role from ${labelOf(user.role)} to ${labelOf(role)}? Their menus, access and permissions will switch to the new role.`,
            "Change Role",
            "Cancel",
            () => {
                reload(true, "text-wait", "Updating Role")
                AccountService.changeRole(
                    user.id,
                    payload,
                    (res) => {
                        reload(true, "")
                        showOutputModal("Role Updated Successfully", "s", () => {
                            reload(false)
                            onChanged?.(user.id, res.role)
                            closeModal(false)
                        })
                    },
                    (x) => {
                        const v = x.response?.data?.errors
                        reload(true, "")
                        showOutputModal((v && Object.values(v)[0]?.[0]) ?? x.response?.data?.message ?? "Failed to Update Role", "e", () => reload(false))
                    }
                )
            }
        )
    }

    const errorText = (f) => errors[f] && <div className="text-[#d12323] text-[0.8em] font-semibold">{errors[f]}</div>
    const programList = programs.map((p) => ({ val: p.id, label: p.name }))
    const positions = info?.positions ?? {}
    const history = info?.history

    return (
        <UpModal close={close} closeModal={closeModal} isEnableOuterClose={true} pd={["px-6", "py-6"]} bgColor="bg-white" w="w-[32rem]">
            <form onSubmit={handleSubmit} className="grid gap-4">
                <div>
                    <h1 className="text-[1.2em] font-bold">Change Role</h1>
                    <p className="text-[0.8em] text-gray-500">
                        {name} · current role: <b>{labelOf(user.role)}</b>
                    </p>
                </div>

                <div className="grid gap-1">
                    <DropdownField
                        default={{ val: "", label: "Select New Role" }}
                        list={roles.filter((r) => r.name !== user.role && r.is_active).map((r) => ({ val: r.name, label: r.label }))}
                        onChange={(e) => pickRole(e.target.value)}
                        name="role"
                        val={role}
                        keepCase={true}
                    />
                    {errorText("role")}
                </div>

                {requiredFields[role] && (
                    <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <h2 className="text-[0.85em] font-semibold">{labelOf(role)} Details</h2>

                        {(role === "student" || role === "teaching_staff") && (
                            <div className="grid gap-1">
                                <DropdownField
                                    default={{ val: "", label: "Select Program" }}
                                    list={programList}
                                    onChange={set("program_id")}
                                    name="program_id"
                                    val={details.program_id}
                                />
                                {errorText("program_id")}
                            </div>
                        )}

                        {role === "student" && (
                            <div className="grid gap-1">
                                <DropdownField
                                    default={{ val: "", label: "Select Year Level" }}
                                    list={yearLevels}
                                    onChange={set("year_level")}
                                    name="year_level"
                                    val={details.year_level === "" ? "" : Number(details.year_level)}
                                    titleCase={true}
                                />
                                {errorText("year_level")}
                                <p className="text-[0.75em] text-gray-500">
                                    {info?.current_semester
                                        ? `Enrolled in ${formatSchoolYearSemester(info.current_semester)}.`
                                        : "No active school year/semester is set — the student can't be enrolled until one is."}
                                </p>
                            </div>
                        )}

                        {(role === "teaching_staff" || role === "non_teaching_staff") && (
                            <div className="grid gap-1">
                                <DropdownField
                                    default={{ val: "", label: "Select Position" }}
                                    list={(positions[role] ?? []).map((p) => ({ val: p, label: positionLabel(p) }))}
                                    onChange={set("position")}
                                    name="position"
                                    val={details.position}
                                    titleCase={true}
                                />
                                {errorText("position")}
                            </div>
                        )}

                        {role === "parent" && (
                            <>
                                <div className="grid gap-1">
                                    <DropdownField
                                        default={{ val: "", label: "Select Parent Role" }}
                                        list={parentRoles}
                                        onChange={set("parent_role")}
                                        name="parent_role"
                                        val={details.parent_role}
                                        titleCase={true}
                                    />
                                    {errorText("parent_role")}
                                </div>
                                <FormTextfield
                                    label="Work Occupation (Optional)"
                                    name="work_occupation"
                                    id="change_role_work_occupation"
                                    val={details.work_occupation ?? ""}
                                    change={set("work_occupation")}
                                />
                            </>
                        )}
                    </div>
                )}

                <div className="grid gap-2">
                    <h2 className="text-[0.85em] font-semibold">Role History</h2>
                    {history == null ? (
                        <div className="text-[0.8em] text-gray-500">Loading...</div>
                    ) : history.length === 0 ? (
                        <div className="text-[0.8em] text-gray-500">No role history.</div>
                    ) : (
                        <ul className="grid gap-1.5">
                            {[...history].reverse().map((h, i) => (
                                <li key={h.id} className="flex items-center justify-between gap-3 text-[0.8em] rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                                    <span className="font-medium">
                                        {h.role?.label ?? h.role?.name}
                                        {i === 0 && <span className="ml-2 text-[0.85em] text-green-700 font-semibold">Current</span>}
                                        {h.is_original_role && <span className="ml-2 text-[0.85em] text-blue-700 font-semibold">Original</span>}
                                    </span>
                                    <span className="text-gray-500 shrink-0">{readableDate(h.created_at)} ({readableTime(h.created_at)})</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex justify-end">
                    <FormButton type="submit" label="Save Role" />
                </div>
            </form>
        </UpModal>
    )
}

export default ChangeRoleModal
