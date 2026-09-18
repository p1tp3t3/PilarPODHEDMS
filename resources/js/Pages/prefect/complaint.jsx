import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import IssueComplaintModal from "@/Components/modal/submission-form/issue-complaint-modal"
import ComplaintList from "@/Components/list/complaint-list"
import { useState } from "react"
import DropdownField from "@/Components/input/dropdown"
import { useReload } from "@/context-provider/reload-provider"
import ViewComplaintModal from "@/Components/modal/view/view-complaint-modal"
import IssueViolationModal from "@/Components/modal/submission-form/issue-violation-modal"
import { ComplaintService } from "@/others/services/complaint-service"
import Btn from "@/Components/button/normal-btn"
import TabSwitcher from "@/Components/other/tab-switcher"
import { router } from "@inertiajs/react"
import SearchUserBar from "@/Components/input/search-user-bar"
import Swal from "sweetalert2"
import withReactContent from "sweetalert2-react-content"
import { change, showWarningModal, showOutputModal } from "@/others/function"
import { ArchiveService } from "@/others/services/archive-service"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import ActionBtn from "@/Components/button/action-btn"
import SetReasonModal from "@/Components/modal/submission-form/set-reason-modal"
import IssueViolationModal2 from "@/Components/modal/submission-form/issue-violation-modal2"
import { List, Clock, RotateCw, Ban, Undo2, X, Check } from "lucide-react"

const PrefectComplaint = (props) => {
  const url = new URLSearchParams(window.location.search)

  const [search, setSearch] = useState("")
  const [issueComplaint, openIssueComplaint] = useState(false)
  const [viewComplaint, openViewComplaint] = useState(false)
  const [complainant_id, setComplainantId] = useState("")
  const [id, setId2] = useState('')
  const [data, setData] = useState({
    complainant: props.user.id,
    complainant_name: "",
    subject: "",
    complaint_incident: "",
    complaint_possible_offense: [],
    complaint_description: "",
  })
  const [data2, setData2] = useState({
    reason: ''
  })
  const [complaint, setComplaint] = useState(null)
  const [rejectReason, openRejectReason] = useState(false)
  const [issueViolation, openIssueViolation] = useState(false)
  const { loadRegister } = useReload()
  const [complaintList, setComplaintList] = useState(props.complaint_list)
  const [select, enableSelect] = useState(false)
  const [select2, enableSelect2] = useState(false)
  const [choose, setChoose] = useState(url.get("status") || "all")
  const params = new URLSearchParams(window.location.search)
  const [role, setRole] = useState(params.get("role") || "all")
  const [schoolYear, setSchoolYear] = useState(params.get("school-year") || "all")
  const [semester, setSemester] = useState(params.get("semester") || "all")
  const optionTab = [
    { key: "all", label: "All Complaints", icon: List },
    { key: "pending", label: "Pending", icon: Clock },
    { key: "ongoing", label: "Ongoing", icon: RotateCw },
    { key: "rejected", label: "Rejected", icon: Ban },
    { key: "revoked", label: "Revoked", icon: Undo2 },
  ];


  const handleSearch = (e) => setSearch(e.target.value)
  const handleChange = (e) => change(e, setData)

  const setId = (id, type, obj = null) => {
    setComplainantId(id)
    if (type === "c") {
      openViewComplaint(true)
    } else if (type === "v") {
      setComplaint(obj)
      openIssueViolation(true)
    }
  }
  const setRequestActionEvent = (type, id) => {
          let route = '',
              confirmTxt = '',
              confirm = false,
              label = '',
              btn = ''
              
          switch(type) {
              case 'confirm':
                  route = `/complaint/verify/${id}/confirm`
                  confirmTxt = 'Comfirming the Complaint'
                  label = 'Are You Sure You Want To Approve The Complaint?'
                  btn = 'Approve Complaint'
                  confirm = true
                  showWarningModal(
                      label,
                      btn,
                      'Cancel',
                      () => {
                          loadRegister(true, "text-wait", confirmTxt)
                          ComplaintService.confirm(id, setter, successConfirm, error)
                      }
                  )
                  break
              case 'cancel':
                  setId2(id)
                  openRejectReason(true)
                  break
              case 'revoke':
                  showWarningModal(
                      'Are You Sure You Want To Revoke This Complaint?',
                      'Revoke Complaint',
                      'Cancel',
                      () => {
                          loadRegister(true, "text-wait", "Revoking Complaint")
                          ComplaintService.revoke(
                              id,
                              setter,
                              () => loadRegister(true, "success", "Complaint Revoked Successfully"),
                              () => loadRegister(true, "error", "Failed to Revoke Complaint")
                          )
                      }
                  )
                  break
              case 'reinstate':
                  showWarningModal(
                      'Are You Sure This Complaint Deserves Another Look? It Will Be Reinstated As Ongoing.',
                      'Approve Rejected Complaint',
                      'Cancel',
                      () => {
                          loadRegister(true, "text-wait", "Reinstating Complaint")
                          ReportArchiveService.recover(
                              id, 'complaint',
                              () => {},
                              () => {
                                  showOutputModal('Complaint Reinstated Successfully', 's', () => {
                                      loadRegister(false)
                                      window.location.reload()
                                  })
                              },
                              () => {
                                  showOutputModal('Failed to Reinstate Complaint', 'e', () => loadRegister(false))
                              }
                          )
                      }
                  )
                  break
              case 'archive':
                  showWarningModal(
                      'Are You Sure You Want To Archive This Complaint?',
                      'Archive Complaint',
                      'Cancel',
                      () => {
                          loadRegister(true, "text-wait", "Archiving Complaint")
                          ArchiveService.transfer(
                              'complaint', id,
                              () => {
                                  showOutputModal('Complaint Archived Successfully', 's', () => {
                                      loadRegister(false)
                                      window.location.reload()
                                  })
                              },
                              () => {
                                  showOutputModal('Failed to Archive Complaint', 'e', () => loadRegister(false))
                              }
                          )
                      }
                  )
                  break
          }
      }

  const handleAction = (type) => {
    let route = '',
        confirmTxt = '',
        confirm = false,
        label = '',
        btn = ''
        
    switch(type) {
        case 'approve':
            confirmTxt = 'Approving the Complaint'
            label = 'Are You Sure You Want To Approve The Selected Complaint?'
            btn = 'Approve Complaint'
            confirm = true
            break
        case 'reject':
            confirmTxt = 'Rejecting the Complaint'
            label = 'Are You Sure You Want To Reject The Selected Complaint?'
            btn = 'Reject Complaint'
            confirm = false
            break
    }
    showWarningModal(
        label,
        btn,
        'Cancel',
        () => {
            const checkboxes = document.querySelectorAll(
              'input[name="selected-row"]:checked'
            );
            const ids = Array.from(checkboxes).map((checkbox) => checkbox.value);
            const param = new URLSearchParams(window.location.search);
            const callBack = (confirm) ? successConfirm : successCancel

            loadRegister(true, "text-wait", confirmTxt)
            ComplaintService.bulkAction(type, ids, param.get("page") || 1, setter, callBack, error)
        }
    )
  }

  const setter = (s) => setComplaintList(s.complaint)
  const successViolation = () =>
    loadRegister(true, "success", "Complaint Resolved Successfully")
  const errorViolation = () =>
    loadRegister(true, "error", "Failed to Resolve Complaint")
  const successConfirm = () =>
    loadRegister(true, "success", "Complaint Approved Successfully")
  const successCancel = () =>
    loadRegister(true, "success", "Complaint Rejected Successfully")
  const error = () =>
    loadRegister(true, "error", "Failed to Perform Action")

  const userType = [
    { val: "student", label: "Student" },
    { val: "prefect", label: "Prefect" },
    { val: "faculty", label: "Faculty" },
    { val: "program_head", label: "Program Head" },
    { val: "staff", label: "Staff" },
    { val: "parent", label: "Parent" },
  ]

  const handleSelect = (type) => {
    if (choose !== type) {
      const link = window.location.pathname
      router.visit(`${link}?status=${type}&role=${role}&school-year=${schoolYear}&semester=${semester}`)
      setChoose(type)
    }
  }

  const handleFilterChange = (field, value) => {
    const link = window.location.pathname
    const newRole = field === "role" ? value : role
    const newSchoolYear = field === "school-year" ? value : schoolYear
    const newSemester = field === "semester" ? value : semester
    router.visit(`${link}?status=${choose}&role=${newRole}&school-year=${newSchoolYear}&semester=${newSemester}`)
  }
  const selectAllRow = (e) => {
    const checked = e.target.checked;
    const checkboxes = document.querySelectorAll('input[name="selected-row"]');
    checkboxes.forEach((checkbox) => {
      checkbox.checked = checked
    })
  }

  return (
    <>
      {/* Modals */}
      <IssueViolationModal2
        close={issueViolation}
        closeModal={openIssueViolation}
        pd={["px-10", "py-7"]}
        reload={loadRegister}
        success={successViolation}
        error={errorViolation}
        isEnableOuterClose={true}
        violation_list={props.violation_list}
        setComplaint={setComplaintList}
        complaint={complaint}
      />
      <SetReasonModal
        close={rejectReason}
        closeModal={openRejectReason}
        pd={["px-10", "py-7"]}
        isEnableOuterClose={true}
        title='Reason to Reject this Complaint'
        data={data2}
        setData={setData2}
        sendData={() => {
          loadRegister(true, "text-wait", 'Rejecting Complaint Is Processing')
          ComplaintService.reject(id, data2.reason, setter, successCancel, error)
        }}
        warning={{ title: 'Are You Sure You Want To Reject This Complaint?' , btn: 'Reject Complaint' }}
      />
      <ViewComplaintModal
        close={viewComplaint}
        closeModal={openViewComplaint}
        pd={["px-10", "py-7"]}
        isEnableOuterClose={true}
        complainant={complainant_id}
        usr={props.user}
      />
      <IssueComplaintModal
        close={issueComplaint}
        closeModal={openIssueComplaint}
        val={data}
        setter={setData}
        pd={["px-5", "py-7"]}
        isEnableOuterClose={true}
        program={props.program}
        student_list={props.students}
        reload={loadRegister}
        change={handleChange}
        user={props.user}
        all_users={props.all_users}
        direct_user_id={props.user.id}
        incident_list={props.incident_list}
      />

        <PageLayout
          title="COMPLAINT"
          rightSideComponent={
            <Btn onclick={() => openIssueComplaint(true)}>
              Report Complaint
            </Btn>
          }
        >
            {/* Search and Filters */}
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-3 items-center">
                {/* Dropdowns */}
                <div className="flex md:flex-nowrap gap-3 w-full md:w-auto justify-start md:justify-end">
                  <div className="w-full sm:w-auto">
                    <DropdownField
                      default={{ val: "all", label: "All Complainants" }}
                      list={userType}
                      onChange={(e) =>
                        handleFilterChange("role", e.target.value)
                      }
                      val={role}
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <DropdownField
                      default={{ val: "all", label: "All School Years" }}
                      list={(props.school_years || []).map((y) => ({ val: y, label: y }))}
                      onChange={(e) =>
                        handleFilterChange("school-year", e.target.value)
                      }
                      val={schoolYear}
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <DropdownField
                      default={{ val: "all", label: "All Semesters" }}
                      list={[
                        { val: 1, label: "1st Semester" },
                        { val: 2, label: "2nd Semester" },
                      ]}
                      onChange={(e) =>
                        handleFilterChange("semester", e.target.value)
                      }
                      val={semester}
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="overflow-x-auto flex justify-between items-center">
                <TabSwitcher tabs={optionTab} value={choose} onChange={handleSelect} />
                {/* Right side */}
                {url.get('status') == 'pending' &&
                <div className="flex flex-wrap gap-3 items-center">
                  <ActionBtn
                    className="bg-blue-700 hover:bg-blue-800"
                    onClick={() => enableSelect2(!select2)}
                  >
                    {select2 ? <X size={16} /> : <Check size={16} />}
                  </ActionBtn>
                  {select2 && (
                    <div className="flex gap-5 items-center flex-wrap">
                      <div className="flex gap-2 items-center text-[0.8em]">
                        <input type="checkbox" id="select-all" onClick={selectAllRow} />
                        <label htmlFor="select-all">Select All</label>
                      </div>
                      <div className="flex gap-2 text-[0.9em]">
                        <ActionBtn 
                            className={"bg-green-600 text-white hover:bg-green-700"}
                            onClick={() => handleAction('approve')}
                        >
                            Approve
                        </ActionBtn>
                        <ActionBtn 
                            className={"bg-red-600 text-white hover:bg-red-700"}
                            onClick={() => handleAction('reject')}
                        >
                            Reject
                        </ActionBtn>
                      </div>
                    </div>
                  )}
                </div>}
              </div>
            </div>

            {/* Complaint List */}
            <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm px-5 py-3 min-w-0">
                <ComplaintList
                  type="prefect"
                  list={complaintList}
                  user={props.user}
                  setId={setId}
                  select={select}
                  select2={select2}
                  actionEvent={setRequestActionEvent}
                />
            </div>
        </PageLayout>
    </>
  )
}

PrefectComplaint.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectComplaint
