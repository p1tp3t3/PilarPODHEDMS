import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import TabSwitcher from "@/Components/other/tab-switcher"
import { useState, useEffect } from "react"
import useListData, { setListQuery } from "@/others/hooks/use-list-data"
import ArchiveList from "@/Components/list/archive-list"
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"
import ViewAbsentFormModal from "@/Components/modal/view/view-absent-form-modal"
import ViewGatePassModal from "@/Components/modal/view/view-gatepass-modal"
import { useReload } from "@/context-provider/reload-provider"
import { router } from "@inertiajs/react"
import NoteAbsentFormModal from "@/Components/modal/submission-form/note-absent-form-modal"
import DropdownField from "@/Components/input/dropdown"
import MobileFilters, { countActive } from "@/Components/other/mobile-filters"
import { Head } from "@inertiajs/react"
import DownloadArchiveModal from "@/Components/modal/submission-form/download-archive-modal"
import { PageActions } from "@/context-provider/page-title-provider"
import Btn from "@/Components/button/normal-btn"
import { Download } from "lucide-react"


// Each document type's final statuses, for the Status dropdown: it changes
// with the tab (All Documents: every one any type can have). Pending and
// ongoing aren't options; such records still show under All Statuses.
const STATUS_OPTIONS = {
    complaint: ['resolved', 'rejected', 'revoked'],
    referral: ['approved', 'rejected', 'revoked'],
    'absent form': ['approved', 'rejected', 'revoked'],
    all: ['resolved', 'approved', 'rejected', 'revoked'],
}
const statusList = (type) => (STATUS_OPTIONS[type] ?? STATUS_OPTIONS.all)
    .map((s) => ({ val: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))

const PrefectArchive = (props) => {
    const optionTab = [
        { key: 'all', label: 'All Documents' },
        { key: 'complaint', label: 'Complaint' },
        { key: 'referral', label: 'Referral' },
        { key: 'absent form', label: 'Absent Form' },
    ]
    const url = new URLSearchParams(window.location.search)
    const [choose, setChoose] = useState(url.has("type") ? url.get("type") : "all"),
          [schoolYear, setSchoolYear] = useState(url.get("school_year") ?? ''),
          [semester, setSemester] = useState(url.get("semester") ?? ''),
          [status, setStatus] = useState(url.get("status") ?? ''),
          [complaint, openViewComplaint] = useState(false),
          [referral, openViewReferral] = useState(false),
          [absent, openAbsentForm] = useState(false),
          [gatepass, openViewGatepass] = useState(false),
          [id, setDocId] = useState(''),

          [archive_list, setArchiveList] = useState(null)
    // The table loads from /api/prefect/archive once the page opens (and
    // after each filter change).
    const { data: lists } = useListData()
    useEffect(() => { if (lists) setArchiveList(lists.document) }, [lists])

    const { loadRegister } = useReload()
    const [noteAbsent, openNoteAbsent] = useState(false),
          [downloadForm, openDownloadForm] = useState(false)

    // Preserves every other active filter (search, school year, etc.) when
    // only one of them changes — switching tabs used to silently drop the
    // active search/year filter since it rebuilt the query string from
    // scratch.
    const updateQuery = (patch) => {
        const params = new URLSearchParams(window.location.search)
        Object.entries(patch).forEach(([key, value]) => {
            if (value) params.set(key, value)
            else params.delete(key)
        })
        // The address bar follows; the table is fetched again from its API.
        setArchiveList(null)
        setListQuery(params)
    }

    const handleSelect = (type) => {
        if(choose != type) {
            setChoose(type)
            // A status the new tab's type doesn't have (e.g. Resolved on
            // Referral) is cleared.
            const keep = (STATUS_OPTIONS[type] ?? STATUS_OPTIONS.all).includes(status)
            if (!keep) setStatus('')
            updateQuery({ type, status: keep ? status : '' })
        }
    }
    const handleStatusChange = (e) => {
        const value = e.target.value
        setStatus(value)
        updateQuery({ status: value })
    }
    const handleSchoolYearChange = (e) => {
        const value = e.target.value
        setSchoolYear(value)
        updateQuery({ school_year: value })
    }
    const handleSemesterChange = (e) => {
        const value = e.target.value
        setSemester(value)
        updateQuery({ semester: value })
    }
    const setId = (id, type) => {
        setDocId(id)
        if(type == 'c') {
            openViewComplaint(true)
        }if(type == 'r') {
            openViewReferral(true)
        }if(type == 'a') {
            openAbsentForm(true)
        }if(type == 'g') {
            openViewGatepass(true)
        }
    }
    return (
        <>
        <Head title="Archive" />
        <DownloadArchiveModal
            close={downloadForm}
            closeModal={openDownloadForm}
            type={choose}
            schoolYear={schoolYear}
            semester={semester}
            schoolYears={props.school_years}
        />
        <NoteAbsentFormModal
            close={noteAbsent}
            closeModal={openNoteAbsent}
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true}
            reload={loadRegister}
            id={id}
            setter={setArchiveList}
        />
        <ViewComplaintModal 
            close={complaint} 
            closeModal={openViewComplaint} 
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true} 
            complainant={id}
            usr={props.auth.user}
        />
        <ViewReferralModal 
            close={referral} 
            closeModal={openViewReferral} 
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true} 
            referralId={id}
        />
        <ViewAbsentFormModal
            close={absent}
            closeModal={openAbsentForm}
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true}
            id={id}
        />
        <ViewGatePassModal
            close={gatepass}
            closeModal={openViewGatepass}
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true}
            id={id}
            approved={false}
            setApprove={() => {}}
            events={() => {}}
        />
            <PageLayout actionsWithFilters
                title="ARCHIVES"
                rightSideComponent={
                    <Btn onclick={() => openDownloadForm(true)} icon={<Download size={19} />}>
                        Download Archive
                    </Btn>
                }
            >
                    <div className="grid gap-3">
                        {/* Tabs */}
                        <div className="w-full">
                            <TabSwitcher tabs={optionTab} value={choose} onChange={handleSelect} />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center md:max-lg:flex-row md:max-lg:flex-nowrap md:max-lg:items-center md:max-lg:[&>div:not(:last-child)]:flex-1 md:max-lg:[&>div:not(:last-child)]:min-w-0 md:max-lg:[&>div:not(:last-child)]:w-auto">
                            <MobileFilters active={countActive(schoolYear, semester, status)}>
                            <div className="w-full sm:w-[14rem] flex-shrink-0">
                                <DropdownField
                                    default={{ val: '', label: 'All School Years' }}
                                    list={(props.school_years ?? []).map((y) => ({ val: y, label: y }))}
                                    onChange={handleSchoolYearChange}
                                    name="school_year"
                                    val={schoolYear}
                                />
                            </div>
                            <div className="w-full sm:w-[14rem] flex-shrink-0">
                                <DropdownField
                                    default={{ val: '', label: 'All Semesters' }}
                                    list={[
                                        { val: '1', label: '1st Semester' },
                                        { val: '2', label: '2nd Semester' },
                                    ]}
                                    onChange={handleSemesterChange}
                                    name="semester"
                                    val={semester}
                                />
                            </div>
                            <div className="w-full sm:w-[14rem] flex-shrink-0">
                                <DropdownField
                                    default={{ val: '', label: 'All Statuses' }}
                                    list={statusList(choose)}
                                    onChange={handleStatusChange}
                                    name="status"
                                    val={status}
                                    keepCase
                                />
                            </div>
                            </MobileFilters>
                            <PageActions />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <ArchiveList
                            list={archive_list}
                            viewDocument={setId}
                            showType={choose === "all"}
                        />
                    </div>
            </PageLayout>
        </>
    )
}

PrefectArchive.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectArchive