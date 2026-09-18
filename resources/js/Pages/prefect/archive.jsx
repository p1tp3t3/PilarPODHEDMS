import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import TabSwitcher from "@/Components/other/tab-switcher"
import { useState } from "react"
import { showOutputModal, showWarningModal, toTitleCase } from "@/others/function"
import ArchiveList from "@/Components/list/archive-list"
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal"
import ViewReferralModal from "@/Components/modal/view/view-referral-modal"
import ViewAbsentFormModal from "@/Components/modal/view/view-absent-form-modal"
import ViewGatePassModal from "@/Components/modal/view/view-gatepass-modal"
import { useReload } from "@/context-provider/reload-provider"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { router } from "@inertiajs/react"
import NoteAbsentFormModal from "@/Components/modal/submission-form/note-absent-form-modal"
import BulkArchiveModal from "@/Components/modal/submission-form/bulk-archive-modal"
import Btn from "@/Components/button/normal-btn"
import DropdownField from "@/Components/input/dropdown"


const PrefectArchive = (props) => {
    const optionTab = [
        { key: 'all', label: 'All' },
        { key: 'complaint', label: 'Complaint' },
        { key: 'referral', label: 'Referral' },
        { key: 'absent form', label: 'Absent Form' },
        { key: 'gate pass', label: 'Gate Pass' },
    ]
    const url = new URLSearchParams(window.location.search)
    const [choose, setChoose] = useState(url.has("type") ? url.get("type") : "all"),
          [schoolYear, setSchoolYear] = useState(url.get("school_year") ?? ''),
          [semester, setSemester] = useState(url.get("semester") ?? ''),
          [complaint, openViewComplaint] = useState(false),
          [referral, openViewReferral] = useState(false),
          [absent, openAbsentForm] = useState(false),
          [gatepass, openViewGatepass] = useState(false),
          [id, setDocId] = useState(''),

          [archive_list, setArchiveList] = useState(props.document)

    const { loadRegister } = useReload()
    const [noteAbsent, openNoteAbsent] = useState(false)
    const [bulkArchive, openBulkArchive] = useState(false)

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
        router.visit(`${window.location.pathname}?${params.toString()}`)
    }

    const handleSelect = (type) => {
        if(choose != type) {
            setChoose(type)
            updateQuery({ type })
        }
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
    // Only absent form still has a recovery action (Approve) — complaint and
    // referral archives are one-way now, no Unarchive button triggers this.
    const recoverDocument = (i, t) => {
        if(t == 'absent form') {
            setId(i)
            openNoteAbsent(true)
        }
    }
    const deleteDocument = (docType, docId) => {
        const label = `Are You Sure You Want To Permanently Remove ${toTitleCase(docType)} No. ${docId}?`
        const buttonLabel = `Delete ${toTitleCase(docType)} No. ${docId}`

        showWarningModal(
            label,
            buttonLabel,
            'Cancel',
            () => {
                loadRegister(true, 'text-wait', `Removing ${toTitleCase(docType)} No. ${docId} In The Archive is Processing`)
                ReportArchiveService.deleteArchived(
                    docType, docId,
                    () => {
                        showOutputModal(
                            `${toTitleCase(docType)} No. ${docId} Has Been Removed Successfully`,
                            's',
                            () => {
                                loadRegister(false)
                                window.location.reload()
                            }
                        )
                    },
                    () => {
                        showOutputModal(
                            `Failed to Removed ${toTitleCase(docType)} No. ${docId}`,
                            'e',
                            () => {
                                loadRegister(false)
                            }
                        )
                    }
                )
            }
        )
    }
    return (
        <>
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
            usr={props.user}
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
        <BulkArchiveModal
            close={bulkArchive}
            closeModal={openBulkArchive}
            pd={['px-10', 'py-7']}
            isEnableOuterClose={true}
            schoolYears={props.school_years}
            reload={() => window.location.reload()}
        />
            <PageLayout
                title="ARCHIVES"
                rightSideComponent={<Btn onclick={() => openBulkArchive(true)}>Bulk Archive</Btn>}
            >
                    <div className="grid gap-3">
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
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
                        </div>
                        <div className="w-full">
                            <TabSwitcher tabs={optionTab} value={choose} onChange={handleSelect} />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <ArchiveList
                            list={archive_list}
                            viewDocument={setId}
                            recoverDocument={recoverDocument}
                            deleteDocument={deleteDocument}
                        />
                    </div>
            </PageLayout>
        </>
    )
}

PrefectArchive.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectArchive