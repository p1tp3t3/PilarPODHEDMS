import DropdownField from "@/Components/input/dropdown"
import SearchUserBar from "@/Components/input/search-user-bar"
import StudentList from "@/Components/list/student-list"
import AuthLayout from "@/Layouts/auth-layout"
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

    router.visit(
      `${link}?program=${
        field === "program" ? value : program
      }&school-year=${field === "school-year" ? value : schoolYear}`
    )
  }
  return (
      <div className="w-full py-4">
        <div className="w-full grid gap-5 relative">
          {/* Header */}
          <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-3">
              <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">STUDENT LIST</h1>
          </div>

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
            </div>
          </div>

          {/* Student List */}
          <div className="w-full overflow-x-auto">
            <StudentList list={props.students} />
          </div>
        </div>
      </div>
  )
}

PrefectStudents.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectStudents
