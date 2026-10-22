import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridToolbarContainer, GridToolbarQuickFilter } from "@/Components/other/data-grid";
import ProfilePic from "../other/profile-pic";
import { getProfilePic, getYearLevel, toTitleCase, studentProgram, showUserType } from "@/others/function";
import { router } from "@inertiajs/react";
import ActionBtn from "@/Components/button/action-btn";

// fromKey: the violation's encrypted id when listed under one violation, so
// the student page's breadcrumb leads back to it.
const StudentViolationList = ({ list = [], fromKey = null }) => {
  const rows = useMemo(
  () =>
    list.map((e, i) => {
      const isStudent = e.user?.role === "student"
      const latestEnrollment = e.user?.enrollments?.[e.user.enrollments.length - 1]
      const programName = isStudent
        ? studentProgram(e.user)
        : e.user?.teaching_staff?.program?.name
      return {
        id: i,
        rowIndex: i,
        student_id: e.student_id,
        id_number: e.user?.id_number ?? 'N/A',
        user: e.user, // ✅ KEEP OBJECT
        studentText: `${e.user?.profile?.first_name || ""} ${e.user?.profile?.middle_name || ""} ${
          e.user?.profile?.last_name || ""
        } ${toTitleCase(programName || "")}`.trim(), // ✅ for filter/sort
        repeat_violations: e.repeat_violations,
        violation_count: e.violation_count,
        major_count: e.major_count,
        minor_count: e.minor_count,
        penalty_count: e.penalty_count,
      }
    }),
  [list]
);


  const hasRepeats = list.some((e) => Array.isArray(e.repeat_violations))

  // Define columns
  const columns = [
    {
      field: "id",
      headerName: "#",
      width: 50,
      renderCell: (params) => <span>{params.value + 1}.</span>,
    },
    { field: "id_number", headerName: "Student ID", width: 120 },
    {
        field: "studentText",
        headerName: "Student",
        width: 260,
        sortable: true,
        filterable: true,
        renderCell: (params) => {
            const user = params.row.user;

            if (!user) return null;

            return (
            <div className="flex items-center gap-3 h-full">
                <ProfilePic
                size={1.9}
                src={getProfilePic(user.profile?.profile_picture, user.profile?.sex)}
                />
                <div className="flex flex-col justify-center leading-tight">
                <h1 className="text-[0.8em] font-bold">
                    {`${user.profile?.first_name || ""} ${user.profile?.middle_name || ""} ${user.profile?.last_name || ""}`}
                </h1>
                <p className="text-[0.7em]">
                    {user.role === "student"
                    ? showUserType(user)
                    : `${user.teaching_staff?.program?.name ?? ""} ${user.teaching_staff?.position === "program_head" ? "(Program Head)" : "(Faculty)"}`.trim()}
                </p>
                </div>
            </div>
            );
        },
    },
    // Violations committed more than once (only when the list has that
    // data — the Student Violations page; a single violation's student list
    // doesn't).
    ...(hasRepeats ? [{
      field: "repeat_violations",
      headerName: "Repeated Violations",
      width: 170,
      type: "number",
      align: "left",
      headerAlign: "left",
      // How many different violations the student committed more than
      // once; hover lists which ones and how many times.
      valueGetter: (value) => value?.length ?? 0,
      renderCell: ({ row, value }) => (
        <span
          className={value ? "font-semibold text-red-700" : "text-gray-500"}
          title={row.repeat_violations?.map((r) => `${toTitleCase(r.name)} ×${r.count}`).join(", ") || "No repeated violations"}
        >
          {value}
        </span>
      ),
    }] : []),
    { field: "violation_count", headerName: "Total Violation Counts", width: 160 },
    {
      field: "actions",
      type: "actions",
      headerName: "Action",
      width: 180,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => {
        const obj = params.row;
        return (
            <div className="flex gap-2 items-center h-full">
                <ActionBtn
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => router.visit(`/student-violation/${obj.user?.encrypted_id}${fromKey ? `?from=${encodeURIComponent(fromKey)}` : ""}`)}
                >
                View
                </ActionBtn>
            </div>
            );
        }
    },
  ];

  return (
    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", p: 2, bgcolor: "white", borderRadius: 2 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        rowsPerPageOptions={[20, 50, 100]} // user-selectable options
        disableSelectionOnClick
        hideFooterSelectedRowCount
        getRowId={(row) => row.id}
        initialState={{
        pagination: { paginationModel: { pageSize: 20, page: 0 } }
        }}
        pageSizeOptions={[20, 50, 100]}
        pagination
        showToolbar
        localeText={{ noRowsLabel: "No Student Violations Found" }}
        // Phones: picture + name + program; tap for counts and View.
        mobileSummary={(row) => ({
          name: [row.user?.profile?.first_name, row.user?.profile?.middle_name, row.user?.profile?.last_name].filter(Boolean).join(" "),
          role: row.user?.role === "student" ? showUserType(row.user) : row.user?.teaching_staff?.program?.name,
          picture: row.user?.profile?.profile_picture,
          sex: row.user?.profile?.sex,
          hide: ["studentText"],
        })}
      />
    </Box>
  );
};

export default StudentViolationList;
