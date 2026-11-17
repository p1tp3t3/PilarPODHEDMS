import { useEffect, useState } from "react"
import UpModal from "../up-modal"
import DropdownField from "@/Components/input/dropdown"
import FieldError from "@/Components/input/field-error"
import FormButton from "@/Components/button/button"
import CheckBoxButton from "@/Components/input/checkbox"
import SearchUserBar from "@/Components/input/search-user-bar"
import SelectedUser from "@/Components/other/selected-user"
import { getProfilePic, showOutputModal } from "@/others/function"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { Validator } from "@/others/classes/validator"

export const ARCHIVE_TYPES = [
    { val: 'all', label: 'All Documents' },
    { val: 'complaint', label: 'Complaint' },
    { val: 'referral', label: 'Referral' },
    { val: 'absent form', label: 'Absent Form' },
]

const SEMESTERS = [
    { val: '1', label: '1st Semester' },
    { val: '2', label: '2nd Semester' },
]

// A student's sides of a complaint: each one ticked is a folder in Complaints/.
const SIDES = [
    { val: 'complainant', label: 'As Complainant' },
    { val: 'subject', label: 'As Subject' },
]
const hasComplaints = (type) => type === 'complaint' || type === 'all'

// {tab}-{school year}-{semester}.zip, e.g. all-documents-2025-2026-1st-semester.zip
// (the same rule as ArchiveController::archiveZipName, which also adds the
// picked person's ID number; the server's name is the one saved).
const zipName = ({ type, school_year, semester }, person) => [
    type === 'all' ? 'all-documents' : type.replace(/\s+/g, '-'),
    school_year,
    semester && (semester === '1' ? '1st-semester' : '2nd-semester'),
    person && '[ID No.]',
].filter(Boolean).join('-') + '.zip'

// What the picked person's documents are, for the line under them.
const personScope = (person, type) => {
    if (person.role !== 'student') return 'Documents this person sent.'
    if (type === 'complaint') return 'Complaints this student filed or was named in, in a folder per side ticked.'
    if (type === 'referral') return 'Referrals this student was referred in.'
    if (type === 'absent form') return 'Absent forms this student sent.'
    return "This student's complaints (a folder per side ticked), referrals they were referred in, and their absent forms."
}

/**
 * Download Archive form: one ZIP of the archived documents for a school
 * year, a semester, or both, and/or one person. All Documents gives a
 * folder per type.
 */
const DownloadArchiveModal = (props) => {
    const initial = () => ({ type: props.type ?? 'all', school_year: props.schoolYear ?? '', semester: props.semester ?? '', sides: ['complainant', 'subject'] })
    const [data, setData] = useState(initial),
          [individual, setIndividual] = useState(false),
          [search, setSearch] = useState(''),
          [person, setPerson] = useState(null),
          [err, setErr] = useState(''),
          [busy, setBusy] = useState(false)

    // Opens on the page's current tab and filters.
    useEffect(() => {
        if (props.close) {
            setData(initial()); setErr('')
            setIndividual(false); setPerson(null); setSearch('')
        }
    }, [props.close])

    const set = (key) => (e) => {
        setData((prev) => ({ ...prev, [key]: e.target.value }))
        setErr('')
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const archiveError = Validator.archiveDownload({ ...data, individual, person })
        if (archiveError) {
            setErr(archiveError)
            return
        }
        const payload = { type: data.type, school_year: data.school_year, semester: data.semester }
        if (person) {
            payload.user_id = person.id
            if (student && hasComplaints(data.type)) payload.sides = data.sides
        }
        setBusy(true)
        ReportArchiveService.downloadArchive(payload, zipName(data, person),
            () => {
                setBusy(false)
                props.closeModal(false)
            },
            (message) => {
                setBusy(false)
                showOutputModal(message ?? 'Failed to download the archive.', 'e')
            })
    }

    return (
        <UpModal
            close={props.close}
            pd={["px-10", "py-4"]}
            isEnableOuterClose={!busy}
            closeModal={props.closeModal}
            bgColor="bg-white"
            w="w-[32rem]"
        >
            <div className="w-full grid gap-3">
                <div className="pt-3 text-[1.2em] text-center">
                    <h1><b>Download Archive</b></h1>
                </div>
                <form onSubmit={handleSubmit} className="py-3 grid gap-4">
                    <DropdownField
                        default={{ val: '', label: 'Select Document Type' }}
                        list={ARCHIVE_TYPES}
                        onChange={set('type')}
                        name="type"
                        val={data.type}
                        disabled={busy}
                        req={true}
                        keepCase
                    />
                    <DropdownField
                        default={{ val: '', label: 'Select School Year' }}
                        list={(props.schoolYears ?? []).map((y) => ({ val: y, label: y }))}
                        onChange={set('school_year')}
                        name="school_year"
                        val={data.school_year}
                        disabled={busy}
                        keepCase
                    />
                    <DropdownField
                        default={{ val: '', label: 'Select Semester' }}
                        list={SEMESTERS}
                        onChange={set('semester')}
                        name="semester"
                        val={data.semester}
                        disabled={busy}
                        keepCase
                    />
                    <div className="grid gap-2">
                        <CheckBoxButton.CheckBox
                            label="Individual"
                            id="archive_individual"
                            name="individual"
                            checked={individual}
                            change={(e) => {
                                setIndividual(e.target.checked)
                                setPerson(null)
                                setSearch('')
                                setErr('')
                            }}
                        />
                        {individual && !person &&
                        <div className="w-full relative">
                            <SearchUserBar
                                setSearch={setSearch}
                                name="search_person"
                                search={search}
                                plc="Search Name or ID Number"
                                handleSearch={(e) => setSearch(e.target.value)}
                                lim={5}
                                def="User Not Found"
                                withLink={false}
                                click={(s, user) => {
                                    setPerson(user)
                                    setSearch('')
                                    setErr('')
                                }}
                                apiLink="/api/all-users/all-2"
                            />
                        </div>}
                        {individual && person &&
                        <div className="grid gap-1">
                            <SelectedUser
                                src={getProfilePic(person.profile?.profile_picture, person.profile?.sex)}
                                name={[person.profile?.first_name, person.profile?.last_name]}
                                user={person}
                                unselect={busy ? null : setPerson}
                            />
                            {person.role === 'student' && hasComplaints(data.type) &&
                            <div className="flex flex-wrap gap-x-4">
                                {SIDES.map((side) => (
                                    <CheckBoxButton.CheckBox
                                        key={side.val}
                                        label={side.label}
                                        id={`archive_side_${side.val}`}
                                        name="sides"
                                        checked={data.sides.includes(side.val)}
                                        change={(e) => {
                                            const on = e.target.checked
                                            setData((prev) => ({
                                                ...prev,
                                                sides: on ? [...prev.sides, side.val] : prev.sides.filter((s) => s !== side.val),
                                            }))
                                            setErr('')
                                        }}
                                    />
                                ))}
                            </div>}
                            <p className="text-[0.8em] text-gray-500 dark:text-gray-400">
                                {personScope(person, data.type)}
                            </p>
                        </div>}
                    </div>
                    <FieldError msg={err} />
                    <p className="text-[0.8em] text-gray-500 dark:text-gray-400">
                        Saved as <b className="break-all">{zipName(data, person)}</b>
                    </p>
                    <FormButton type="submit" label="Download" loading={busy} />
                </form>
            </div>
        </UpModal>
    )
}

export default DownloadArchiveModal
