import DropdownField from "@/Components/input/dropdown"
import SearchUserBar from "@/Components/input/search-user-bar"
import StudentList from "@/Components/list/student-list"
import AuthLayout from "@/Layouts/auth-layout"
import PageLayout from "@/Layouts/page-layout"
import { useState } from "react"
import { router } from "@inertiajs/react"

const PrefectStudents = (props) => {
  const [search, setSearch] = useState("")
  const [isSearchFocus, focusSearch] = useState(false)

  const params = new URLSearchParams(window.location.search)

  const handleSearch = (e) => {
    const val = e.target.value
    setSearch(val)
  }

  const handleSelect = (field, value) => {
    const link = window.location.pathname

    const program = params.get("program") || "all"
    const schoolYear = params.get("school-year") || "all"
    const semester = params.get("semester") || "all"

    router.visit(
      `${link}?program=${
        field === "program" ? value : program
      }&school-year=${field === "school-year" ? value : schoolYear}&semester=${
        field === "semester" ? value : semester
      }`
    )
  }
  return (
      <PageLayout title="STUDENT LIST">
          {/* Search + Filters */}
          <div className="flex justify-between">
            <div className="flex gap-3">
              <DropdownField
                default={{ val: "all", label: "All Programs" }}
                list={props.program}
                val={params.get("program")}
                onChange={(e) => handleSelect("program", e.target.value)}
              />
              <DropdownField
                  default={{ val: "all", label: "Select School Year" }}
                  list={(props.school_years || []).map((y) => ({ val: y, label: y }))}
                  val={params.get("school-year")}
                  onChange={(e) => handleSelect("school-year", e.target.value)}
              />
              <DropdownField
                  default={{ val: "all", label: "All Semesters" }}
                  list={[
                      { val: 1, label: "1st Semester" },
                      { val: 2, label: "2nd Semester" },
                  ]}
                  val={params.get("semester")}
                  onChange={(e) => handleSelect("semester", e.target.value)}
              />
            </div>
          </div>

          {/* Student List */}
          <div className="w-full min-w-0">
            <StudentList list={props.students} />
          </div>
      </PageLayout>
  )
}

PrefectStudents.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectStudents
