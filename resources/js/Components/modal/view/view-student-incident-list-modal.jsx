import UpModal from "../up-modal"
import { useState, useEffect } from "react"
import { RiskPredictionService } from "@/others/services/risk-prediction-service"
import { AlertCircle } from "lucide-react"
import { 
  getProfilePic, 
  readableDate, 
  readableTime, 
  showWarningModal, 
  toTitleCase 
} from "@/others/function"
import SelectedUser from "@/Components/other/selected-user"
import CircleReload from "@/Components/reload/circle-reload"
import { Link } from "@inertiajs/react"
import QuantityCard from "@/Components/card/qntty-statistic-card"
import GaugeChart from "@/Components/card/gauge-chart-statistic-card"
import { TriangleAlert } from "lucide-react"

const ViewStudentIncidentListModal = (props) => {
  const [data, setData] = useState(null)
  const [reload, setReload] = useState(false)

  useEffect(() => {
    if (props.close) {
      setReload(true)
      getIncidentInfoInfo()
    } else {
      setReload(false)
      setData(null)
    }
  }, [props.close])

  const getIncidentInfoInfo = () => {
    RiskPredictionService.getStudentIncidentList(props.student_id, setData)
  }

  return (
    <UpModal
      close={props.close}
      closeModal={props.closeModal}
      isEnableOuterClose={props.isEnableOuterClose}
      pd={props.pd}
      bgColor="bg-white"
      w="w-full sm:w-[90%] md:w-[40rem]"
    >
      <div className="w-full grid gap-4">
        {data ? (
          <Body data={data} usr={props.user} />
        ) : (
          reload && (
            <div className="flex justify-center py-6">
              <CircleReload size={3} />
            </div>
          )
        )}
      </div>
    </UpModal>
  )
}

const Body = ({ data, usr, type }) => {
  const user = usr
  const [err, setErr] = useState("")
  const [notifyFaculty, setNotifyFaculty] = useState(false)
  const [notifyProgramHead, setNotifyProgramHead] = useState(false)

  const riskStatus = (r, type = "color") => {
    if (type === 'color2') {
      if (r >= 84) return '#e12b2b'; // 🔴 very high
      if (r >= 60) return '#e67e22'; // 🟠 high
      if (r >= 31) return '#e6a800'; // 🟡 moderate
      return '#32a852';              // 🟢 low
    }if (type === "color") {
      if (r <= 30) return "#32a852"
      if (r <= 59) return "#e6a800"
      return "#d12424"
    } if (type === 'level') {
        if (r >= 84) return 'Critical Risk';
        if (r >= 60) return 'High Risk';
        if (r >= 31) return 'Moderate Risk';
        return 'Low Risk';
    }
  }
  const formatTripleAsterisk = (text) => {
    return text.replace(/\*\*(.*?)\*\*/g, (_, boldText) => {
      return `<b>${toTitleCase(boldText)}</b>`;
    });
};


  const handleNotify = () => {
    const d = {
      student_id: user.id,
      risk_score: Math.round(data.risk_score * 100),
      program: user.program?.id,
      program_head: notifyProgramHead ? 1 : 0,
      faculty: notifyFaculty ? 1 : 0,
    }

    const label = notifyFaculty && notifyProgramHead
      ? "Faculty and Program Head"
      : notifyFaculty
      ? "Faculty"
      : "Program Head"

    if (notifyFaculty || notifyProgramHead) {
      setErr("")
      showWarningModal(
        `Are you sure you want to notify the ${label} of the ${user.program?.name ?? "student's"} program?`,
        `Notify ${label}`,
        "Cancel",
        () => {
          RiskPredictionService.notifyRisk(d, success, error)
        }
      )
    } else {
      setErr("You must choose at least one option to notify.")
    }
  }

  const success = () => {
    alert("Notification sent successfully!")
  }
  const error = () => {
    alert("Failed to send notification.")
  }

  return (
    <>
      <div className="text-center text-xl sm:text-2xl font-bold">
        <h1>{user.first_name}'s Violation Risk</h1>
      </div>
      <div className="mt-4">
        <h2 className="text-sm font-semibold">Student:</h2>
        <Link href={`/profile/${user.username}`}>
          <SelectedUser
            src={getProfilePic(user.profile_picture, user.sex)}
            name={[user.first_name, user.last_name]}
            user={user}
          />
        </Link>
      </div>

      <div className="mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuantityCard h="h-[9rem]" num={data.total_incidents} icon={TriangleAlert} label="Total Incidents" color={{ bg: "bg-white border" }} />
          <QuantityCard h="h-[9rem]" num={data.total_violations} icon={TriangleAlert} label="Total Violations" color={{ bg: "bg-white border" }} />
          <QuantityCard h="h-[9rem]" num={data.total_repeated_violations} icon={TriangleAlert} label="Repeated Violations" color={{ bg: "bg-white border" }} />
          <QuantityCard h="h-[9rem]" num={data.total_no_violations} icon={TriangleAlert} label="Resolved Cases Without Violations" color={{ bg: "bg-white border" }} />
        </div>
      </div>

      <div className="mt-6 border-t pt-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Recent Incidents */}
          <div className="flex-1">
            <h2 className="text-sm font-semibold mb-2">Recent Incidents Reported:</h2>
            <div className="overflow-y-auto max-h-[15rem] sm:max-h-[20rem] space-y-2">
              {data.incident.length ? (
                data.incident.map((e, i) => (
                  <Row key={i} i={i + 1} data={e} type="incident" showDate />
                ))
              ) : (
                <div className="text-center text-gray-500 py-10">
                  <AlertCircle size="1.5rem" />
                  <h1 className="text-lg">No Incidents Yet</h1>
                </div>
              )}
            </div>
          </div>

          {/* Recent Violations */}
          <div className="flex-1">
            <div className="lg:flex justify-between items-center">
              <h2 className="text-sm font-semibold mb-2">Recent Violations Committed:</h2>
              <div className="text-sm font-semibold mb-2">
                <div className="text-[0.8em] flex gap-2 text-white">
                  <span className="bg-yellow-500 rounded-full px-2 py-[0.1rem]">
                    Minor
                  </span>
                  <span className="bg-red-500 rounded-full px-2 py-[0.1rem]">
                    Major
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[15rem] sm:max-h-[20rem] space-y-2">
              {data.violations.length ? (
                data.violations.map((e, i) => (
                  <Row key={i} i={i + 1} data={e} type="violation" showDate />
                ))
              ) : (
                <div className="text-center text-gray-500 py-10">
                  <AlertCircle size="1.5rem" />
                  <h1 className="text-lg">No Violations Yet</h1>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6 border-t pt-4">
        <div className="">
          <h2 className="text-sm font-semibold mb-2">Repeated Violation Cases:</h2>
          <div className="overflow-y-auto max-h-[15rem] sm:max-h-[20rem] space-y-2">
            {data.repeated_violation_list.length ? (
              data.repeated_violation_list.map((e, i) => (
                <Row key={i} i={i + 1} data={e} type="r-violation" />
              ))
            ) : (
              <div className="text-center text-gray-500 py-10">
                <AlertCircle size="1.5rem" />
                <h1 className="text-lg">No Violations Yet</h1>
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Incidents */}
          <div className="flex-1">
            <h2 className="text-sm font-semibold mb-2">Resolved Cases Without Violations:</h2>
            <div className="overflow-y-auto max-h-[15rem] sm:max-h-[20rem] space-y-2">
              {data.no_violation_list.length ? (
                data.no_violation_list.map((e, i) => (
                  <Row key={i} i={i + 1} data={e} type="incident" />
                ))
              ) : (
                <div className="text-center text-gray-500 py-10">
                  <AlertCircle size="1.5rem" />
                  <h1 className="text-lg">No Resolved Cases Without Violations Yet</h1>
                </div>
              )}
            </div>
          </div>
      </div>

      <div className="mt-10 grid lg:grid-cols-[22rem_1fr] gap-10 items-start">

        {/* ---- GAUGE CARD ---- */}
        <div className="w-full flex-shrink-0">
          <div className="bg-white rounded-xl shadow-md border p-6">
            <div className="flex justify-center">
              <div className="">
                <GaugeChart
                  title={
                    <div className="font-semibold text-center text-gray-900">
                      Likelihood of Another Repeated Violation
                    </div>
                  }
                  value={Math.round(data.risk_score * 100)}
                  label={
                    <span
                      className="text-white px-4 py-1 text-[0.8em] rounded-full shadow-sm"
                      style={{
                        backgroundColor: riskStatus(
                          Math.round(data.risk_score * 100),
                          "color2"
                        ),
                      }}
                    >
                      {riskStatus(Math.round(data.risk_score * 100), "level")}
                    </span>
                  }
                  colorScheme={[
                    riskStatus(Math.round(data.risk_score * 100), "color2"),
                    "#e5e5e5",
                  ]}
                />
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-1 text-center">
              Indicates the estimated likelihood that this student might commit another repeated violation.
            </div>
          </div>
        </div>

        {/* ---- INSIGHT CARD ---- */}
        <div className="grid gap-6">

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Insight</h3>

            <div 
              className="text-sm text-gray-800 max-h-[17rem] overflow-y-auto leading-relaxed text-justify"
              dangerouslySetInnerHTML={{
                __html: formatTripleAsterisk(data.insights[type == 'prefect' ? 'insight_summary' : 'insight_summary_student'])
              }}
            />
          </div>

          {/* ---- RECOMMENDATION CARD ---- */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Recommendation</h3>

            <div 
              className="text-sm text-gray-800 leading-relaxed text-justify"
              dangerouslySetInnerHTML={{
                __html: formatTripleAsterisk(data.recommendation[type == 'prefect' ? 'recommendation' : 'recommendation_student'])
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}

const Row = ({ i, data, type, showDate }) => {
  const isViolation = type === "violation" || type === "r-violation";

  // Determine display text
  const name = isViolation ? data?.violation_name : data?.incident;

  // Determine timestamp source
  const dateSource = type === "violation"
    ? data?.offense_issued_at
    : type === "r-violation"
    ? null
    : data?.created_at;
  
  const occurence = type === 'r-violation'
                    ? `(${data?.total_occurrences} Count${data?.total_occurrences > 1 ? 's' : ''})`
                    : ''

  const timestamp = dateSource
    ? `${readableDate(dateSource)} (${readableTime(dateSource)})`
    : "";

  // Determine status colors (use string comparison to avoid type issues)
  const isMajor = String(data?.offense_status) === "1";
  const statusClass = isViolation
    ? isMajor
      ? "border-red-500 bg-red-100"
      : "border-yellow-500 bg-yellow-100"
    : "";

  return (
    <div
      className={`border ${statusClass} rounded-md px-3 py-2 text-gray-800 text-sm`}
    >
      <div className="grid gap-2">
        <div>
          {occurence} <b>{toTitleCase(name || "Unknown")}</b>
        </div>
        {type != 'r-violation' &&
        <div>
          <span className="text-[0.9em] px-2 py-1 bg-blue-500 rounded-full text-white">
            Case Number {data.case_number}
          </span>
        </div>}
      </div>
      {(timestamp && type != 'r-violation') && (
        <>
          <br />
          <span className="text-[0.85em]">{showDate && <>{type == 'incident' ? `Reported Since ${timestamp}` : `Resolved Since ${timestamp}`}</>}</span>
        </>
      )}
    </div>
  );
};


ViewStudentIncidentListModal.Body = Body
export default ViewStudentIncidentListModal
