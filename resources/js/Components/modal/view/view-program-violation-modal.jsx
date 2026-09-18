import UpModal from "../up-modal"
import { useState, useEffect } from "react"
import { ReportArchiveService } from "@/others/services/report-archive-service"
import { AlertCircle } from "lucide-react"
import { getProfilePic, showUserType, readableDate, toTitleCase } from "@/others/function"
import ProfilePic from "@/Components/other/profile-pic"
import CircleReload from "@/Components/reload/circle-reload"
import { Link } from "@inertiajs/react"

const ViewProgramViolationModal = (props) => {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (props.close && props.program) {
      setData(null)
      ReportArchiveService.getProgramViolationDetail(
        {
          program: props.program,
          date_from: props.dateFrom || "",
          date_to: props.dateTo || "",
        },
        setData
      )
    }
  }, [props.close, props.program, props.dateFrom, props.dateTo])

  return (
    <UpModal
      close={props.close}
      closeModal={props.closeModal}
      isEnableOuterClose={props.isEnableOuterClose}
      pd={props.pd}
      bgColor="bg-white"
      w="w-full sm:w-[90%] md:w-[36rem]"
    >
      <div className="w-full grid gap-4">
        {data ? (
          <>
            <div className="text-center text-xl sm:text-2xl font-bold">
              {props.program}
            </div>
            <div className="flex justify-center gap-3">
              <span className="text-[0.85em] font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                {data.students_with_violations} Student{data.students_with_violations !== 1 ? "s" : ""} With Violations
              </span>
              <span className="text-[0.85em] font-semibold text-red-700 bg-red-100 px-3 py-1 rounded-full">
                {data.total_violations} Total Violations
              </span>
            </div>

            <div className="space-y-4 max-h-[28rem] overflow-y-auto mt-2">
              {data.students.length ? (
                data.students.map((row, i) => (
                  <div key={i} className="border border-gray-300 bg-white shadow-sm rounded-lg px-4 py-3">
                    <Link
                      href={`/student-violation/${row.user.id}`}
                      className="flex justify-between items-center gap-3 hover:opacity-80"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-blue-700 text-[1em] w-6 text-center">
                          {i + 1}.
                        </span>
                        <ProfilePic
                          size={2.3}
                          src={getProfilePic(row.user.profile?.profile_picture, row.user.profile?.sex)}
                        />
                        <div>
                          <h1 className="text-[0.9em] font-semibold text-gray-900 leading-tight">
                            {`${row.user.profile?.first_name ?? ""} ${
                              row.user.profile?.middle_name ? row.user.profile.middle_name + " " : ""
                            }${row.user.profile?.last_name ?? ""}`}
                          </h1>
                          <p className="text-[0.75em] text-gray-500">{showUserType(row.user)}</p>
                        </div>
                      </div>
                      <span className="text-[0.85em] font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full self-start sm:self-auto">
                        {row.total_violations} Violation{row.total_violations !== 1 ? "s" : ""}
                      </span>
                    </Link>

                    <div className="mt-3 grid gap-2">
                      {row.violations.map((v, j) => {
                        const isMajor = String(v.offense_status) === "1"
                        return (
                          <div
                            key={j}
                            className={`border rounded-md px-3 py-2 text-gray-800 text-[0.85em] ${
                              isMajor ? "border-red-500 bg-red-100" : "border-yellow-500 bg-yellow-100"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <b>{toTitleCase(v.violation_name || "Unknown")}</b>
                              {v.case_number && (
                                <span className="text-[0.9em] px-2 py-0.5 bg-blue-500 rounded-full text-white">
                                  Case Number {v.case_number}
                                </span>
                              )}
                            </div>
                            {v.offense_issued_at && (
                              <div className="text-[0.85em] mt-1">
                                Issued Since {readableDate(v.offense_issued_at)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-10">
                  <AlertCircle size="1.5rem" />
                  <h1 className="text-lg">No Students With Violations</h1>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex justify-center py-6">
            <CircleReload size={3} />
          </div>
        )}
      </div>
    </UpModal>
  )
}

export default ViewProgramViolationModal
