import AuthLayout from "@/Layouts/auth-layout"
import QuantityCard from "@/Components/card/qntty-statistic-card"
import "../style.css"
import LineGraph from "@/Components/card/line-graph-statistic"
import DoughnutChart from "@/Components/card/pie-chart-statistic-card"
import DropdownField from "@/Components/input/dropdown"
import Calendar from "@/Components/schedule/calendar"
import AbsentFormList from "@/Components/list/absent-form-list"
import StudentList from "@/Components/list/student-list"
import { useEffect, useState } from "react"
import { getWebLink, showWarningModal, toTitleCase } from "@/others/function"
import { DashboardService } from "@/others/services/dashboard-service"
import BarGraph from "@/Components/card/bar-graph-statistic-card"
import AppointmentTodayList from "@/Components/list/appointment-today-list"
import NewStudentList from "@/Components/list/new-student-list"
import StudentNotificationList from "@/Components/list/student-notification-list"
import TabSwitcher from "@/Components/other/tab-switcher"
import UnresolvedComplaintModal from "@/Components/modal/validation/unresolved-complaint-modal"
import { Link, router } from "@inertiajs/react"
import LatestActiveAccountList from "@/Components/list/latest-active-user-list"
import OffenseList from "@/Components/list/offense-list"
import PenaltyList from "@/Components/list/penalty-list"
import { motion } from "framer-motion"
import { GraduationCap, Hourglass, RefreshCw, FileText, Archive } from "lucide-react"

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
  const [selectedRange, setSelectedRange] = useState("yearly")
  const [timeline, setTimeLine] = useState(
    selectedRange == "yearly" ? currentYear : currentMonth
  )
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
  const [bargraphComplaint, setBargraphComplaint] = useState(props.bargraph)
  console.log(props.label)

  useEffect(() => {
    const count = props.countLastMonthUnresolvedComplaint,
          clicked = localStorage.getItem("is-unresolved-complaint-modal-clicked")

    if(count > 0 && clicked) {
        showWarningModal(
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
      }
  }, [])

  const doughnutDataset = [
    {
      data: [props.complaint_piechart.pending, props.complaint_piechart.ongoing],
      backgroundColor: ["#ff9f40", "#ffce06"],
      hoverBackgroundColor: ["#ff9f40", "#ffce06"],
    },
  ]

  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEPT",
    "OCT",
    "NOV",
    "DEC",
  ]

  const getDaysArray = (arg) => {
    const y = arg.includes("-") ? arg : currentMonth
    const [yearStr, monthStr] = y.split("-")
    const year = parseInt(yearStr, 10)
    const monthIndex = parseInt(monthStr, 10) - 1
    const days = new Date(year, monthIndex + 1, 0).getDate()
    const monthName = monthNames[monthIndex]
    return Array.from({ length: days }, (_, i) => `${monthName} ${i + 1}`)
  }

  const optionTab1 = [
    { key: "student", label: "New Students" },
    { key: "appointment", label: "Scheduled Appointments" },
    { key: "notification", label: "Notification" },
  ]

  const optionTab2 = [
    { val: "offense", label: "Offenses" },
    { val: "penalty", label: "Penalties" },
  ]

  const program = props.program

  const barDataset = () => {
    const l = []
    for (let a = 0; a < program.length; a++) {
      const color = program[a]["color_code"],
        c = [color, color, color, color, color, color],
        r = []

      bargraphComplaint.forEach((e, i) => r.push(e.count[a]))
      l.push({
        data: r,
        label: program[a]["name"],
        backgroundColor: c,
        hoverBackgroundColor: c,
      })
    }
    return l
  }

  useEffect(() => {
    const t =
      selectedRange == "monthly"
        ? currentMonth
        : selectedRange == "yearly"
        ? currentYear
        : timeline

    DashboardService.getBargraph([selectedTitle, selectedRange, timeline], setBargraphComplaint)
  }, [selectedTitle, selectedRange, timeline])

  const yearDropdown = () => {
    const l = []
    const date = new Date()
    for (let a = date.getFullYear(); a >= 2024; a--) {
      l.push({ value: `${a}`, label: `${a}` })
    }
    return l
  }

  const handleBarGraphSelect = (e = selectedTitle) => {
    setSelectedTitle(e)
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

  const handleTimeLineSelect = (e) => {
    setTimeLine(e.target.value)
    handleBarGraphSelect()
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
        <div className="w-full py-10">
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
                {/* Statistic Cards */}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  <Link href="/prefect/student-list" className="h-full grid">
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
                </div>

                {/* Bar Graph + Doughnut Chart */}
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="w-full lg:w-[70%]">
                    <BarGraph
                      dataset={barDataset()}
                      withBorder={true}
                      label={
                        selectedRange == "yearly"
                          ? monthNames
                          : getDaysArray(timeline)
                      }
                      title={
                        <DropdownField
                          list={[
                            {
                              val: "complainants",
                              label: "No. of Complainants Per Program",
                            },
                            {
                              val: "violators",
                              label: "No. of Offenders Per Program",
                            },
                          ]}
                          titleCase={true}
                          value={selectedTitle}
                          onChange={(e) => handleBarGraphSelect(e.target.value)}
                        />
                      }
                      side={
                        <div className="flex flex-wrap gap-2 items-center text-sm">
                          <DropdownField
                            list={[
                              { val: "yearly", label: "Yearly" },
                              { val: "monthly", label: "Monthly" },
                            ]}
                            value={selectedRange}
                            titleCase={true}
                            className="text-sm"
                            onChange={(e) => {
                              setSelectedRange(e.target.value)
                              handleBarGraphSelect()
                            }}
                          />
                          {selectedRange != "monthly" ? (
                            <DropdownField
                              list={yearDropdown()}
                              value={timeline}
                              titleCase={true}
                              onChange={handleTimeLineSelect}
                            />
                          ) : (
                            <input
                              type="month"
                              onChange={handleTimeLineSelect}
                              value={timeline}
                              className="border rounded px-2 py-1"
                            />
                          )}
                        </div>
                      }
                    />
                  </div>

                  <div className="w-full lg:w-[30%]">
                    <DoughnutChart
                      dataset={doughnutDataset}
                      label={["Pending", "Ongoing"]}
                      title="Today's Complaints"
                      side={
                        <div className="text-[0.8em]">
                          <Link
                            className="hover:underline"
                            href={`/prefect/complaints?date=${now}`}
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
                  <div className="w-full bg-white rounded-md shadow-md">
                    <div className="px-5 py-3 w-full">
                      <TabSwitcher tabs={optionTab1} value={choose} onChange={handleSelect} />
                    </div>
                    {choose == "student" && (
                      <NewStudentList list={props.students} weekStart={props.students_week_start} weekEnd={props.students_week_end} />
                    )}
                    {choose == "appointment" && (
                      <AppointmentTodayList list={props.appointment_today} />
                    )}
                    {choose == "notification" && <StudentNotificationList />}
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
