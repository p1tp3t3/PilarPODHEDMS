import AuthLayout from "@/Layouts/auth-layout"
import QuantityCard from "@/Components/card/qntty-statistic-card"
import "../style.css"
import LineGraph from "@/Components/card/line-graph-statistic"
import DoughnutChart from "@/Components/card/pie-chart-statistic-card"
import DropdownField from "@/Components/input/dropdown"
import Calendar from "@/Components/schedule/calendar"
import AbsentFormList from "@/Components/list/absent-form-list"
import StudentList from "@/Components/list/student-list"
import { useEffect, useRef, useState } from "react"
import { getWebLink, showWarningModal, toTitleCase } from "@/others/function"
import { DashboardService } from "@/others/services/dashboard-service"
import BarGraph from "@/Components/card/bar-graph-statistic-card"
import AppointmentTodayList from "@/Components/list/appointment-today-list"
import NewStudentList from "@/Components/list/new-student-list"
import StudentNotificationList from "@/Components/list/student-notification-list"
import TabSwitcher from "@/Components/other/tab-switcher"
import UnresolvedComplaintModal from "@/Components/modal/validation/unresolved-complaint-modal"
import CurrentSemesterBanner from "@/Components/other/current-semester-banner"
import MaintenanceScheduleReminder from "@/Components/other/maintenance-schedule-reminder"
import CurrentDateTime from "@/Components/other/current-datetime"
import { Head, Link, router } from "@inertiajs/react"
import LatestActiveAccountList from "@/Components/list/latest-active-user-list"
import OffenseList from "@/Components/list/offense-list"
import PenaltyList from "@/Components/list/penalty-list"
import { motion } from "framer-motion"
import { GraduationCap, Hourglass, RefreshCw, FileText, Archive, ShieldAlert } from "lucide-react"

const PrefectDashBoard = (props) => {
  const date = new Date()
  const now = `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`,
    currentYear = `${date.getFullYear()}`,
    currentMonth = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`

  const domain = getWebLink(null, null, 5000)
  const [activeTab, setActiveTab] = useState("statistics")
  const [selectedTitle, setSelectedTitle] = useState("complainants")
  // Bar graph range: a school year (its 1st sem start month → 2nd sem end
  // month), a calendar year, or one month (day by day).
  const [selectedRange, setSelectedRange] = useState("school_year")
  const [schoolYearId, setSchoolYearId] = useState(
    props.current_school_year_id ?? props.bargraph_school_years?.[0]?.id ?? ""
  )
  const [semester, setSemester] = useState("")
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const period =
    selectedRange === "school_year" ? schoolYearId
    : selectedRange === "yearly" ? selectedYear
    : selectedMonth
  const [choose, setChoose] = useState("student")
  const [choose2, setChoose2] = useState("overview")
  const [choose3, setChoose3] = useState("offense")
  const [
    unresolvedComplaint,
    openUnresolvedComplaint,
  ] = useState(
    props.countLastMonthUnresolvedComplaint >= 10 &&
      localStorage.getItem("is-unresolved-complaint-modal-clicked")
  )
  const [bargraphComplaint, setBargraphComplaint] = useState(props.bargraph ?? [])

  useEffect(() => {
    const count = props.countLastMonthUnresolvedComplaint,
          clicked = localStorage.getItem("is-unresolved-complaint-modal-clicked")

    if(count > 0 && clicked) {
        const fire = () => showWarningModal(
          toTitleCase(`You Have ${count} ${props.label}. Do You Want to See the Unresolved Complaints?`),
          'See Unresolved Complaints',
          'Later',
          () => {
            localStorage.removeItem('is-unresolved-complaint-modal-clicked');
            router.visit('/prefect/complaints?status=ongoing')
          },
          () => {
            localStorage.removeItem('is-unresolved-complaint-modal-clicked');
          }
        )

        // Right after logging in, AuthLayout's own "Welcome" modal is also
        // about to fire (its effect runs after this one, since child
        // effects run before parent effects) — both use the same shared
        // SweetAlert2 instance, so firing this one in the same tick makes
        // it clobber/get clobbered by that one. Let the welcome modal have
        // its moment first, then follow up with this one.
        if (localStorage.getItem('show-login-success')) {
          setTimeout(fire, 400)
        } else {
          fire()
        }
      }
  }, [])

  const doughnutDataset = [
    {
      data: [props.complaint_piechart.pending, props.complaint_piechart.ongoing],
      backgroundColor: ["#ff9f40", "#ffce06"],
      hoverBackgroundColor: ["#ff9f40", "#ffce06"],
    },
  ]

  const optionTab1 = [
    { key: "student", label: "New Students" },
    { key: "appointment", label: "Appointments" },
    { key: "notification", label: "Notifications" },
  ]

  const optionTab2 = [
    { val: "offense", label: "Offenses" },
    { val: "penalty", label: "Penalties" },
  ]

  const program = props.program

  // Programs without a color_code would otherwise render as black bars.
  const FALLBACK_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5"]

  const barDataset = () =>
    program.map((p, a) => {
      const color = p.color_code || FALLBACK_COLORS[a % FALLBACK_COLORS.length]
      return {
        data: bargraphComplaint.map((e) => e.count?.[a] ?? 0),
        label: p.name,
        backgroundColor: color,
        hoverBackgroundColor: color,
        borderRadius: 3,
        // Seven programs share each month, so use the full slot width.
        barPercentage: 0.95,
        categoryPercentage: 0.9,
        maxBarThickness: 22,
      }
    })

  const barLabels = bargraphComplaint.map((e) => e.label)

  // The first render already has the active school year's data from the
  // page props, so only refetch once a filter actually changes.
  const firstBarFetch = useRef(true)
  useEffect(() => {
    if (firstBarFetch.current) {
      firstBarFetch.current = false
      return
    }
    if (!period) return
    DashboardService.getBargraph(
      [selectedTitle, selectedRange, period, selectedRange === "school_year" ? semester : ""],
      setBargraphComplaint
    )
  }, [selectedTitle, selectedRange, period, semester])

  const yearDropdown = () => {
    const l = []
    for (let a = new Date().getFullYear(); a >= 2024; a--) {
      l.push({ val: `${a}`, label: `${a}` })
    }
    return l
  }


  const handleSelect = (type) => {
    if (choose != type) {
      setChoose(type)
    }
  }

  const handleSelect2 = (type) => {
    if (choose2 != type) {
      setChoose2(type)
      setChoose3(type)
    }
  }

  const handleSelect3 = (type) => {
    if (choose3 != type) {
      setChoose3(type)
    }
  }


  const optionTab = [
    { key: "overview", label: "Overview" },
    { key: "offense", label: "List of Violations" },
    { key: "penalty", label: "List of Penalties" },
  ]

  /*
  <UnresolvedComplaintModal
        close={unresolvedComplaint}
        closeModal={openUnresolvedComplaint}
        pd={["px-10", "py-7"]}
        isEnableOuterClose={false}
        count={props.countLastMonthUnresolvedComplaint}
      />
   */
  return (
    <>
        <Head title="Dashboard" />
        <div className="w-full py-10">
          <MaintenanceScheduleReminder />

          <div>
            <TabSwitcher tabs={optionTab} value={choose2} onChange={handleSelect2} />
          </div>

          {/* Overview Section */}
          {choose2 == "overview" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="flex flex-col gap-5 pt-6">
                <div className="-mb-4 lg:-mb-6">
                  <CurrentDateTime />
                  <CurrentSemesterBanner />
                </div>

                {/* Statistic Cards */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <Link href="/prefect/user-list?tab=student&is-enrolled=1" className="h-full grid">
                    <QuantityCard
                      h="h-[6rem]"
                      num={props.student}
                      icon={GraduationCap}
                      label="Total Enrolled Students"
                      color={{ bg: "bg-white hover:bg-black/5 transition-all" }}
                    />
                  </Link>
                  <Link href="/prefect/complaints?status=pending" className="h-full grid">
                    <QuantityCard
                      h="h-[6rem]"
                      num={props.pending_complaint}
                      icon={Hourglass}
                      label="Total Pending Complaints"
                      color={{ bg: "bg-white hover:bg-black/5 transition-all" }}
                    />
                  </Link>
                  <Link href="/prefect/complaints?status=ongoing" className="h-full grid">
                    <QuantityCard
                      h="h-[6rem]"
                      num={props.ongoing_complaint}
                      icon={RefreshCw}
                      label="Total Ongoing Complaints"
                      color={{ bg: "bg-white hover:bg-black/5 transition-all" }}
                    />
                  </Link>
                  <Link href="/prefect/referrals" className="h-full grid">
                    <QuantityCard
                      h="h-[6rem]"
                      num={props.referral}
                      icon={FileText}
                      label="Total Referrals"
                      color={{ bg: "bg-white hover:bg-black/5 transition-all" }}
                    />
                  </Link>
                  <Link href="/prefect/archive" className="h-full grid">
                    <QuantityCard
                      h="h-[6rem]"
                      num={props.archive}
                      icon={Archive}
                      label="Total Documents"
                      color={{ bg: "bg-white hover:bg-black/5 transition-all" }}
                    />
                  </Link>
                  <Link href="/violation-management" className="h-full grid">
                    <QuantityCard
                      h="h-[6rem]"
                      num={props.total_violation}
                      icon={ShieldAlert}
                      label="Total Violations"
                      color={{ bg: "bg-white hover:bg-black/5 transition-all" }}
                    />
                  </Link>
                </div>

                {/* Bar Graph + Doughnut Chart */}
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="w-full lg:w-[70%]">
                    <BarGraph
                      dataset={barDataset()}
                      withBorder={true}
                      height="20rem"
                      label={barLabels}
                      title={
                        <div className="w-full sm:w-[17rem]">
                          <DropdownField
                            list={[
                              { val: "complainants", label: "No. of Complainants Per Program" },
                              { val: "violators", label: "No. of Offenders Per Program" },
                            ]}
                            keepCase={true}
                            val={selectedTitle}
                            onChange={(e) => setSelectedTitle(e.target.value)}
                          />
                        </div>
                      }
                      side={
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <div className="w-full sm:w-[9.5rem]">
                            <DropdownField
                              list={[
                                { val: "school_year", label: "School Year" },
                                { val: "yearly", label: "Yearly" },
                                { val: "monthly", label: "Monthly" },
                              ]}
                              keepCase={true}
                              val={selectedRange}
                              onChange={(e) => setSelectedRange(e.target.value)}
                            />
                          </div>
                          <div className="w-full sm:w-[9.5rem]">
                            {selectedRange === "school_year" && (
                              <DropdownField
                                list={(props.bargraph_school_years ?? []).map((y) => ({ val: y.id, label: `SY ${y.year}` }))}
                                keepCase={true}
                                val={schoolYearId}
                                onChange={(e) => setSchoolYearId(e.target.value)}
                              />
                            )}
                            {selectedRange === "yearly" && (
                              <DropdownField
                                list={yearDropdown()}
                                keepCase={true}
                                val={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                              />
                            )}
                            {selectedRange === "monthly" && (
                              <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                                className="w-full h-[2.5rem] rounded-lg border border-gray-300 bg-white px-3 text-[0.85em] focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                          </div>
                          {selectedRange === "school_year" && (
                            <div className="w-full sm:w-[9.5rem]">
                              <DropdownField
                                default={{ val: "", label: "All Semesters" }}
                                list={[
                                  { val: "1", label: "1st Semester" },
                                  { val: "2", label: "2nd Semester" },
                                ]}
                                keepCase={true}
                                val={semester}
                                onChange={(e) => setSemester(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      }
                    />
                  </div>

                  <div className="w-full lg:w-[30%]">
                    <DoughnutChart
                      dataset={doughnutDataset}
                      label={["Pending", "Ongoing"]}
                      title="This Week's Complaints"
                      side={
                        <div className="text-[0.8em]">
                          <Link
                            className="hover:underline"
                            href={`/prefect/complaints?status=all&date_from=${props.students_week_start}&date_to=${props.students_week_end}`}
                          >
                            See All
                          </Link>
                        </div>
                      }
                    />
                  </div>
                </div>

                {/* Lists Section */}
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Fixed height so switching tabs doesn't resize the panel;
                      each tab's list scrolls inside it. */}
                  <div className="w-full min-w-0 bg-white rounded-md shadow-md flex flex-col h-[30rem] overflow-hidden">
                    <div className="px-3 sm:px-5 pt-2 w-full shrink-0">
                      <TabSwitcher tabs={optionTab1} value={choose} onChange={handleSelect} fullWidth />
                    </div>
                    <div className="flex-1 min-h-0">
                      {choose == "student" && (
                        <NewStudentList list={props.students} weekStart={props.students_week_start} weekEnd={props.students_week_end} />
                      )}
                      {choose == "appointment" && (
                        <AppointmentTodayList list={props.appointment_today} />
                      )}
                      {choose == "notification" && <StudentNotificationList />}
                    </div>
                  </div>
                  <div className="w-full lg:w-[50%]">
                    <LatestActiveAccountList list={props.active} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Offense Section */}
          {choose2 == "offense" && (
            <motion.div
              className="pt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <OffenseList list={props.offense_list} />
            </motion.div>
          )}
          {choose2 == "penalty" && (
            <motion.div
              className="pt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <PenaltyList list={props.penalty_list} />
            </motion.div>
          )}
        </div>
    </>
  )
}

PrefectDashBoard.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectDashBoard
