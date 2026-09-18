import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { DataGrid, GridActionsCellItem, GridToolbarContainer, GridToolbarQuickFilter } from "@/Components/other/data-grid";
import ProfilePic from "../other/profile-pic";
import { getProfilePic, getYearLevel, toTitleCase } from "@/others/function";
import { router } from "@inertiajs/react";
import ActionBtn from "@/Components/button/action-btn";

const StudentViolationList = ({ list = [] }) => {
  const rows = useMemo(
  () =>
    list.map((e, i) => {
      const isStudent = e.user?.role === "student"
      const latestEnrollment = e.user?.enrollments?.[e.user.enrollments.length - 1]
      const programName = isStudent
        ? e.user?.program?.name
        : e.user?.teaching_staff?.program?.name
      return {
        id: i,
        rowIndex: i,
        student_id: e.student_id,
        user: e.user, // ✅ KEEP OBJECT
        studentText: `${e.user?.profile?.first_name || ""} ${e.user?.profile?.middle_name || ""} ${
          e.user?.profile?.last_name || ""
        } ${toTitleCase(programName || "")}`.trim(), // ✅ for filter/sort
        school_year: isStudent ? (latestEnrollment?.school_year?.year ?? 'N / A') : 'N / A',
        violation_count: e.violation_count,
        major_count: e.major_count,
        minor_count: e.minor_count,
        penalty_count: e.penalty_count,
      }
    }),
  [list]
);


  // Define columns
  const columns = [
    {
      field: "id",
      headerName: "#",
      width: 50,
      renderCell: (params) => <span>{params.value + 1}.</span>,
    },
    { field: "student_id", headerName: "Student ID", width: 120 },
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
                    ? user.program?.name
                    : `${user.teaching_staff?.program?.name ?? ""} ${user.teaching_staff?.position === "program_head" ? "(Program Head)" : "(Faculty)"}`.trim()}
                </p>
                </div>
            </div>
            );
        },
    },
    { field: "school_year", headerName: "School Year", width: 160 },
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
                    onClick={() => router.visit(`/student-violation/${obj.student_id}`)}
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
      />
    </Box>
  );
};

export default StudentViolationList;
