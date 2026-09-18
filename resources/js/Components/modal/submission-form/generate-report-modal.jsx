import { useEffect, useState } from "react"
import UpModal from "../up-modal"
import { change, showOutputModal, getProfilePic, toTitleCase } from "@/others/function"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import BetweenTextfield from "@/Components/input/between-input"
import FormTextfield from "@/Components/input/form-input"
import FormButton from "@/Components/button/button"
import DropdownField from "@/Components/input/dropdown"
import CheckBoxButton from "@/Components/input/checkbox"
import SearchUserBar from "@/Components/input/search-user-bar"
import SelectedUser from "@/Components/other/selected-user"
import RadioButton from "@/Components/input/radio"

const DEFAULT_DATA = {
    type: 'incident',
    report_type: '',
    program: '',
    individual: false,
    file_type: 'pdf',
    date_from: '',
    date_to: '',
    school_year: '',
    student_id: '',
    report_name: ''
}

// Creates or edits a saved, reusable report filter — this used to generate
// a file immediately, but generating is now a separate step from the
// Saved Filters page (see report-filter-list.jsx) so the same filter can
// be re-run later, edited, or deleted instead of retyped every time.
const GenerateReportModal = (props) => {
    const editingFilter = props.editingFilter ?? null
    const isEditing = !!editingFilter

    const [data, setData] = useState(DEFAULT_DATA)
    const [filterBy, setFilterBy] = useState('date') // 'date' | 'school_year'
    const [individual, setIndividual] = useState(false),
          [searchComplainant, setSearchComplainant] = useState(""),
          [searchedComplainant, setSearchedComplainant] = useState(null),
          [reload, setReload] = useState(false)

    useEffect(() => {
        if (!props.close) return

        if (editingFilter) {
            const filters = editingFilter.filters ?? {}
            setData({ ...DEFAULT_DATA, ...filters })
            setFilterBy(filters.school_year ? 'school_year' : 'date')
            setIndividual(!!filters.individual)
            setSearchedComplainant(
                filters.individual && filters.student_id
                    ? (props.students ?? []).filter((s) => s.id == filters.student_id)
                    : null
            )
        } else {
            // Which report type this filter is for comes from whichever
            // tab "Create Filter" was clicked on — not a choice made here.
            setData({ ...DEFAULT_DATA, type: props.defaultType || DEFAULT_DATA.type })
            setFilterBy('date')
            setIndividual(false)
            setSearchedComplainant(null)
        }
        setSearchComplainant("")
    }, [props.close, editingFilter, props.defaultType])

    const handleSearchComplainant = (e) => {
        const val = e.target.value;
        setSearchComplainant(val);
    }
    const handleChange = (e) => {
        change(e, setData)
    }
    const handleSubmit = (e) => {
        e.preventDefault()

        if (filterBy === 'school_year' && !data.school_year) {
            showOutputModal('Please select a school year.', 'e')
            return
        }

        setReload(true)

        const onSuccess = () => {
            setReload(false)
            props.closeModal(false)
            props.onSaved?.()
        }
        const onError = () => {
            setReload(false)
            showOutputModal(`Failed to ${isEditing ? 'update' : 'create'} filter.`, 'e')
        }

        if (isEditing) {
            ReportArchiveService.updateReportFilter(editingFilter.id, data, onSuccess, onError)
        } else {
            ReportArchiveService.createReportFilter(data, onSuccess, onError)
        }
    }
    const getSearchedComplainant = (s) => {
        const f = props.students.filter((e, i) => e.id == s)
        setSearchedComplainant(f)
        setSearchComplainant('')
        setData((prev) => ({
            ...prev,
            student_id: f[0].id
        }))
    }

    const hasSubType = data.type == 'incident' || data.type == 'violation'

    const list = (data.type == 'incident')
                ?
                [
                    { val: 'all', label: `All Incidents` },
                    ...props.incidents.map(v => ({
                        val: v.id,
                        label: v.violation_name
                    }))
                ]
                :
                [
                    { val: 'all', label: `All Violations` },
                    ...props.violations.map(v => ({
                        val: v.id,
                        label: v.violation_name
                    }))
                ]

    return (
        <UpModal
            close={props.close}
            pd={["px-10", "py-4"]}
            isEnableOuterClose={props.close}
            closeModal={props.closeModal}
            bgColor="bg-white"
            w="w-[30rem]"
        >
            <div className="w-full grid gap-3">
                <div className="pt-3 text-[1.2em] text-center grid gap-1">
                    <h1><b>{isEditing ? 'Edit Report Filter' : 'Create Report Filter'}</b></h1>
                    {!props.allowTypeChoice &&
                    <p className="text-[0.6em] text-gray-500">{toTitleCase(data.type)} Report</p>}
                </div>
                <div className="py-3 w-full">
                    <form onSubmit={handleSubmit} method="post">
                        <div className="grid gap-5">
                            <div>
                                <FormTextfield
                                    label="Filter Name (Optional)"
                                    name="report_name"
                                    id="report_name"
                                    val={data.report_name}
                                    change={handleChange}
                                />
                            </div>
                            {props.allowTypeChoice &&
                            <div>
                                <RadioButton
                                    list={[
                                        { val: 'incident', label: 'Incident' },
                                        { val: 'violation', label: 'Violation' },
                                        { val: 'tardy', label: 'Tardy' },
                                        { val: 'appointment', label: 'Appointment' },
                                        { val: 'gatepass', label: 'Gate Pass' },
                                    ]}
                                    id="type"
                                    name="type"
                                    val={data.type}
                                    change={handleChange}
                                />
                            </div>}
                            <div className="grid gap-2">
                                <CheckBoxButton.CheckBox
                                    label='Individual Student Report'
                                    id='individual'
                                    name='individual'
                                    checked={data.individual}
                                    change={(e) => {
                                        setIndividual(e.target.checked)
                                        setData((prev) => ({
                                            ...prev,
                                            individual: e.target.checked
                                        }))
                                    }}
                                />
                                {data.individual &&
                                <div className="grid gap-2">
                                    <div className="w-full relative">
                                        <SearchUserBar
                                            setSearch={setSearchComplainant}
                                            name="search_complainant"
                                            search={searchComplainant}
                                            plc="Search Student"
                                            handleSearch={handleSearchComplainant}
                                            lim={5}
                                            def='User Not Found'
                                            withLink={false}
                                            click={getSearchedComplainant}
                                            apiLink="/api/all-users/student"
                                        />
                                    </div>
                                    {(searchedComplainant) &&
                                    <div>
                                    <div className="text-[0.8em]">Student:</div>
                                        <SelectedUser
                                            src={getProfilePic(searchedComplainant[0].profile?.profile_picture, searchedComplainant[0].profile?.sex)}
                                            name={[searchedComplainant[0].profile?.first_name, searchedComplainant[0].profile?.last_name]}
                                            user={searchedComplainant[0]}
                                            unselect={setSearchedComplainant}
                                        />
                                    </div>}
                                </div>}
                            </div>
                            {hasSubType &&
                            <div className="w-full">
                                <DropdownField.Search
                                    default={{ val: '', label: `Select ${data.type == 'incident' ? 'Incidents' : 'Violations'}` }}
                                    list={list}
                                    onChange={handleChange}
                                    name="report_type"
                                    val={data.report_type}
                                />
                            </div>}
                            {!individual &&
                            <div className="w-full">
                                <DropdownField
                                    default={{ val: '', label: 'Select Program' }}
                                    list={[
                                        { val: 'all', label: 'All Programs' },
                                        ...props.programs
                                    ]}
                                    onChange={handleChange}
                                    name="program"
                                    val={data.program}
                                />
                            </div>}
                            <div>
                                <RadioButton
                                    list={[
                                        { val: 'date', label: 'Date Range' },
                                        { val: 'school_year', label: 'School Year' },
                                    ]}
                                    id="filter_by"
                                    name="filter_by"
                                    val={filterBy}
                                    change={(e) => {
                                        const val = e.target.value
                                        setFilterBy(val)
                                        setData((prev) => ({
                                            ...prev,
                                            date_from: '',
                                            date_to: '',
                                            school_year: '',
                                        }))
                                    }}
                                />
                            </div>
                            {filterBy === 'date' &&
                            <div>
                                <BetweenTextfield
                                    type="date"
                                    labels={['Date From', 'Date To']}
                                    name={['date_from',  'date_to']}
                                    id={['date_from',  'date_to']}
                                    data={[data.date_from, data.date_to]}
                                    setData={setData}
                                />
                            </div>}
                            {filterBy === 'school_year' &&
                            <div className="w-full">
                                <DropdownField
                                    default={{ val: '', label: 'Select School Year' }}
                                    list={(props.schoolYears || []).map((y) => ({ val: y, label: y }))}
                                    onChange={handleChange}
                                    name="school_year"
                                    val={data.school_year}
                                />
                            </div>}
                            <div>
                                <RadioButton
                                    list={[
                                        { val: 'pdf', label: 'PDF File' },
                                        { val: 'excel', label: 'Excel File' },
                                    ]}
                                    change={handleChange}
                                    name="file_type"
                                    id='file_type'
                                    val={data.file_type}
                                />
                            </div>
                            <div className="grid">
                                <FormButton
                                    type="submit"
                                    label={isEditing ? 'Save Changes' : 'Create Filter'}
                                    loading={reload}
                                />
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </UpModal>
    )
}

export default GenerateReportModal
