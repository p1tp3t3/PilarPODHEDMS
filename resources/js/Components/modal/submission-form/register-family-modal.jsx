import UpModal from "../up-modal"
import SearchUserBar from "@/Components/input/search-user-bar"
import { useEffect, useMemo, useState } from "react"
import FormTextfield from "@/Components/input/form-input"
import ProfilePic from "@/Components/other/profile-pic"
import FormButton from "@/Components/button/button"
import { FamilyService } from "@/others/services/family-service"
import { getProfilePic, includeObjAtt, showOutputModal, showWarningModal, toTitleCase, showUserType } from "@/others/function"
import { Validator } from "@/others/classes/validator"
import CheckBoxButton from "@/Components/input/checkbox"
import TabSwitcher from "@/Components/other/tab-switcher"
import { X } from "lucide-react"

const RegisterFamilyModal = (props) => {
    const [activeTab, setActiveTab] = useState("register")
    const [info, viewInfo] = useState(false)

    const [submit, setSubmit] = useState(false)

    const [searchFamily, setSearchFamily] = useState("")
    const [isSearchFFocus, focusSearchF] = useState(false)
    const [selectedFamily, setSelectedFamily] = useState(null)

    const handleJoinFamily = (e) => {
        e.preventDefault()

        if (!selectedFamily?.id && !selectedFamily?.family_id) {
            showOutputModal("Please select a family group to join.", "e")
            return
        }

        const familyId = selectedFamily.id ?? selectedFamily.family_id

        if (!submit) {
            showWarningModal(
                "This will send your request to join the selected family group. Continue?",
                "Join Family",
                "Cancel",
                () => {
                    setSubmit(true)
                    props.reload?.(true, "text-wait", "Your request is processing...")

                    FamilyService.joinFamily(
                        familyId,
                        () => {
                            props.reload?.(true, "")
                            showOutputModal("Join request sent successfully.", "s", () => {
                                props.closeModal(false)
                                props.reload?.(false)
                            })
                        },
                        (err) => {
                            const message = err?.response?.data?.message ?? "Something went wrong."
                            props.reload?.(true, "")
                            showOutputModal("Failed to send join request. " + message, "e", () => {
                                props.reload?.(false)
                                setSubmit(false)
                            })
                        }
                    )
                }
            )
        }
    }

    const [searchS, setSearchS] = useState("")
    const [isSearchSFocus, focusSearchS] = useState(false)
    const [searchedStudent, setSearchedStudent] = useState([])

    const [data, setData] = useState({
        parents: [],
        children: [],
        family_group_name: "",
    })

    const [errors, setErrors] = useState(false)
    const [validationErr, setValidationError] = useState({})


    const handleSearchS = (e) => setSearchS(e.target.value)

    const handleFamilyName = (e) => {
        const val = e?.target?.value ?? ""
        setData((prev) => ({ ...prev, family_group_name: val }))
    }

    const handleRegisterFamily = (e) => {
        e.preventDefault()

        const parents = data.parents
        const cleanedParents = parents.map((parent) => {
            const updated = {}
            for (const key in parent) {
                const cleanKey = key.replace(/\d+$/, "")
                updated[key.includes("parent_role") ? cleanKey : key] = parent[key]
            }
            return updated
        })

        const filterAtt = ["user_id"]

        const familyData = {
            family_group_name: data.family_group_name,
            parents: cleanedParents,
            students: includeObjAtt(searchedStudent, filterAtt),
        }

        const validator = new Validator(familyData)
        // make sure your validator checks family_group_name + students, etc.
        const errors = validator.validateFamilyRegistrationForm()

        const isErrorFree = Object.values(errors).every((err) => err === "")
        setValidationError(errors)
        setErrors(!isErrorFree)

        if (!isErrorFree) return

        if (!submit) {
            showWarningModal(
                "This will create their parent account for children monitoring and send their credentials to your email. Are you sure you want to register your family?",
                "Register Family",
                "Cancel",
                () => {
                    setSubmit(true)
                    props.reload?.(true, "text-wait", "Your Parent / Guardian Registration is Processing.")

                    FamilyService.registerFamily(familyData, registerSuccess, registerError)
                }
            )
        }
    }

    const registerSuccess = () => {
        props.reload?.(true, "")
        showOutputModal("Family Registered Successfully", "s", () => {
            props.closeModal(false)
            props.reload?.(false)
        })
    }

    const registerError = (err) => {
        const message = err?.response?.data?.message ?? "Something went wrong."
        props.reload?.(true, "")
        showOutputModal("Failed to Register Family. " + message, "e", () => {
            props.reload?.(false)
            setSubmit(false)
        })
    }

    const getSelectedStudent = (i) => {
        const select = props.student_list.find((e) => e.id == i)
        setSearchedStudent((prev) => {
            const alreadyExists = prev.some((student) => student.id === select.id)
            if (alreadyExists) return prev
            return [...prev, select]
        })
        setSearchS("")
    }

    const removeStudent = (i) => {
        const newList = searchedStudent.filter((_, index) => index !== i)
        setSearchedStudent(newList)
    }

    return (
        <UpModal
            close={props.close}
            closeModal={props.closeModal}
            isEnableOuterClose={props.isEnableOuterClose}
            pd={props.pd}
            bgColor="bg-white"
            w="w-[40rem]"
        >
            <div className="w-full grid gap-4">
                <div className="pt-3">
                    <h1 className="text-[1.2em]">
                        <b>Family</b>
                    </h1>
                </div>

                <div className="w-full grid gap-3">
                    <TabSwitcher
                        tabs={[
                            { key: "register", label: "Register Family" },
                            { key: "join", label: "Join Family" },
                        ]}
                        value={activeTab}
                        onChange={setActiveTab}
                    />
                    <div className="flex items-center gap-2 text-[0.9em]">
                        <input type="checkbox" name="" id="view-info" onChange={(e) => viewInfo(e.target.checked)} />
                        <label htmlFor="view-info">View Info</label>
                    </div>

                    {(props.parent != null && info) && 
                    <div className="h-[10rem] overflow-hidden overflow-y-auto">
                        <Body data={props.parent} />
                    </div>}

                    {/* JOIN FAMILY TAB */}
                    {activeTab === "join" && (
                        <div className="py-2 w-full">
                            <form onSubmit={handleJoinFamily} method="post" className="grid gap-5">
                                <div className="grid gap-2">
                                    <div className="text-[0.9em]">Search Family Group</div>
                                    <div className="relative">
                                        <SearchUserBar
                                            setSearch={setSearchFamily}
                                            search={searchFamily}
                                            isFocus={isSearchFFocus}
                                            plc="Search Family Group"
                                            focus={focusSearchF}
                                            handleSearch={(e) => setSearchFamily(e.target.value)}
                                            lim={6}
                                            list={[]} // SearchUserBar expects a list prop; keep empty; it will use API results
                                            def="Family Not Found"
                                            withLink={false}
                                            profile={false}
                                            label="family_name"
                                            click={(id) => {
                                                // Expecting SearchUserBar to return selected id
                                                // If it returns object in your version, update this accordingly
                                                setSelectedFamily({ id })
                                                setSearchFamily("")
                                            }}
                                            apiLink="/api/all-users/family" // <-- CHANGE to your real search API
                                        />
                                    </div>

                                    <div className="mt-2 rounded-lg border p-3 bg-gray-50">
                                        <div className="text-[0.85em] text-gray-600">Selected Family</div>
                                        <div className="text-[0.95em] mt-1">
                                            <b>{selectedFamily?.name ?? selectedFamily?.id ?? "-"}</b>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full grid">
                                    <FormButton type="submit" label="Save Changes" />
                                </div>
                            </form>
                        </div>
                    )}

                    {/* REGISTER FAMILY TAB */}
                    {activeTab === "register" && (
                        <div className="py-2 w-full">
                            <form onSubmit={handleRegisterFamily} method="post" className="grid gap-5">
                                <div>
                                    <FormTextfield
                                        label="Family Group Name"
                                        name="family_group_name"
                                        value={data.family_group_name}
                                        onChange={handleFamilyName}
                                        placeholder="e.g. Dela Cruz Family"
                                    />
                                    {validationErr.family_group_name && (
                                        <div className="text-[#d12323] text-[15px]">
                                            <b>{validationErr.family_group_name}*</b>
                                        </div>
                                    )}
                                </div>

                                <SearchUserSection
                                    label="Add Children (Students)"
                                    setSearch={setSearchS}
                                    name="student_search"
                                    search={searchS}
                                    isSearchFocus={isSearchSFocus}
                                    plc="Search Student"
                                    focusSearch={focusSearchS}
                                    handleSearch={handleSearchS}
                                    searchList={searchedStudent}
                                    def="Student Not Found"
                                    getSelect={getSelectedStudent}
                                    unselect={removeStudent}
                                    user={props.user}
                                />

                                {validationErr.parent && (
                                    <div className="text-[#d12323] text-[15px]">
                                        <b>{validationErr.parent}*</b>
                                    </div>
                                )}
                                {validationErr.parent_role && (
                                    <div className="text-[#d12323] text-[15px]">
                                        <b>{validationErr.parent_role}*</b>
                                    </div>
                                )}

                                <div className="w-full grid">
                                    <FormButton type="submit" label="Create" />
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </UpModal>
    )
}
const Body = ({ data }) => {
    const children = JSON.parse(data.parent_details).children
    return (
        <div className="grid gap-4">
            <div className="grid grid-cols-3 items-start">
                <span className="text-sm font-medium text-gray-500">
                    Parent Name:
                </span>
                <span className="text-[0.9em] col-span-2 text-gray-800 font-medium">
                    {data.name || '-'}
                </span>
            </div>
            <div className="grid grid-cols-3 items-start">
                <span className="text-sm font-medium text-gray-500">
                    Role:
                </span>
                <span className="text-[0.9em] col-span-2 text-gray-800 font-medium">
                    {toTitleCase(JSON.parse(data.parent_details).parent_role)}
                </span>
            </div>
            <div className="grid grid-cols-3 items-start">
                <span className="text-sm font-medium text-gray-500">
                    Parent Email:
                </span>
                <span className="text-[0.9em] col-span-2 text-gray-800 font-medium">
                    {data.email || '-'}
                </span>
            </div>
            <div className="grid gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                        Children
                    </span>
                    <span className="text-[0.75em] px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {children.length} {children.length === 1 ? "Child" : "Children"}
                    </span>
                </div>

                {children.length > 0 ? (
                    <div className="grid gap-3 max-h-[18rem] overflow-y-auto pr-1">
                        {children.map((child, i) => (
                            <div
                                key={i}
                                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-[0.92em] font-semibold text-gray-800">
                                        Child #{i + 1}
                                    </h3>
                                    {child.program && (
                                        <span className="text-[0.72em] px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                            {child.program}
                                        </span>
                                    )}
                                </div>

                                <div className="grid gap-2 text-[0.83em]">
                                    <InfoRow
                                        label="Student ID"
                                        value={child.student_id}
                                    />
                                    <InfoRow
                                        label="Full Name"
                                        value={[
                                            child.first_name,
                                            child.middle_name,
                                            child.last_name,
                                        ]
                                            .filter(Boolean)
                                            .join(" ") || "-"}
                                    />
                                    <InfoRow
                                        label="Sex"
                                        value={
                                            child.sex === "m"
                                                ? "Male"
                                                : child.sex === "f"
                                                ? "Female"
                                                : "-"
                                        }
                                    />
                                    <InfoRow
                                        label="Program"
                                        value={child.program || "-"}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-[0.85em] text-gray-500">
                        No children submitted.
                    </div>
                )}
            </div>
        </div>
    )
}

const InfoRow = ({ label, value }) => {
    return (
        <div className="grid grid-cols-3 gap-3">
            <span className="text-gray-500 font-medium">{label}</span>
            <span className="col-span-2 text-gray-800">{value || "-"}</span>
        </div>
    )
}

const SelectedUser = (props) => {
    const isStudent =
        props.user.role == "student"
            ? `${props.user.program?.name ?? ''} ${props.user.enrollments?.[props.user.enrollments.length - 1]?.year_level ?? ''}`.trim()
            : toTitleCase(props.user.parent?.parent_role ?? props.user.role)

    return (
        <div className="flex-shrink-0 grid relative w-[5rem]">
            <div className="justify-self-center grid">
                <div>
                    <div className="grid w-[2.5rem] justify-self-center">
                        {props.unselect && (
                            <div className="absolute">
                                <button
                                    type="button"
                                    className="bg-gray-300 relative top-[-0.3rem] z-[5] w-[1.2rem] h-[1.2rem] rounded-full text-[0.8em]"
                                    onClick={() => props.unselect(props.index)}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                        <div className="justify-self-center">
                            <ProfilePic src={props.src} size={2.5} />
                        </div>
                    </div>
                    <div className="text-[0.7em] text-center">
                        <h1>
                            <b>{`${props.name[0]} ${props.name[1]} (${isStudent})`}</b>
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    )
}

const SearchUserSection = ({
    label,
    setSearch,
    isSearchFocus,
    name,
    plc,
    focusSearch,
    handleSearch,
    search,
    searchList,
    def,
    getSelect,
    unselect,
}) => {
    return (
        <div className="grid gap-2">
            <div className="text-[0.9em]">{label}</div>
            <div className="relative">
                <SearchUserBar
                    setSearch={setSearch}
                    name={name}
                    search={search}
                    isFocus={isSearchFocus}
                    plc={plc}
                    focus={focusSearch}
                    handleSearch={handleSearch}
                    lim={4}
                    list={searchList}
                    def={def}
                    withLink={false}
                    click={getSelect}
                    apiLink="/api/all-users/family-student"
                />
            </div>

            <div className="flex overflow-y-hidden overflow-x-auto w-full">
                {searchList.length != 0
                    ? searchList.map((e, i) => (
                          <SelectedUser
                              key={i}
                              src={getProfilePic(e.profile?.profile_picture, e.profile?.sex)}
                              name={[e.profile?.first_name, e.profile?.last_name]}
                              user={e}
                              unselect={unselect}
                              index={i}
                          />
                      ))
                    : ""}
            </div>
        </div>
    )
}

export default RegisterFamilyModal