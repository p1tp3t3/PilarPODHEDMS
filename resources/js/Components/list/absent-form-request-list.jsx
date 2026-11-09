import React, { useContext, useMemo, useState, useEffect } from "react";
import StatusPill from "@/Components/list/status-pill";
import { Box } from "@mui/material";
import { DataGrid, GridActionsCellItem } from "@/Components/other/data-grid";
import ProfilePic from "../other/profile-pic";
import ActionBtn from "../button/action-btn";
import {
  getProfilePic,
  readableDate,
  readableTime,
  showUserType,
  toTitleCase,
  formatSchoolYearSemester,
} from "../../others/function";
import AuthContext from "@/context-provider/auth-provider";
import ListSkeleton from "../reload/list-skeleton";
import { useIsMobile } from "@/others/use-is-mobile";
import { statusLabel } from "@/Components/other/mobile-card-list";


const statusFor = (e) => {
  if (e.revoked_at) return "revoked";
  if (e.rejected_at) return "rejected";
  if (e.confirmed_at) return "approved";
  return "pending";
};

// Date over its school year / semester.
const sinceCell = (date, sys) => (
  <div className="text-[0.8em] leading-tight py-2">
    <div>{date ? `${readableDate(date)} (${readableTime(date)})` : "—"}</div>
    {date && formatSchoolYearSemester(sys) && (
      <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(sys)}</div>
    )}
  </div>
);

// # | Reference No. | Status | Submitted Since | Action
const compactColumns = (events) => [
  { field: "index", headerName: "#", width: 60 },
  { field: "form_number", headerName: "Reference No.", flex: 1, minWidth: 140 },
  {
    field: "status",
    headerName: "Status",
    width: 130,
    renderCell: ({ value }) => (
      <StatusPill status={value} />
    ),
  },
  {
    field: "created_at",
    headerName: "Submitted Since",
    flex: 1,
    minWidth: 180,
    renderCell: ({ row }) => sinceCell(row.created_at, row.school_year_semester),
  },
  {
    field: "actions",
    type: "actions",
    headerName: "Action",
    width: 110,
    headerAlign: "left",
    align: "left",
    renderCell: ({ row }) => (
      <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => events(row.encrypted_id, "view")}>
        View
      </ActionBtn>
    ),
  },
];

const AbsentFormRequestList = ({ list = null, events, noted = false }) => {
  const { usr } = useContext(AuthContext);
  const urlStatus = new URLSearchParams(window.location.search).get("status");

  // Flatten data for DataGrid
  const rows = useMemo(() => {
    if (!list) return [];
    const data = Array.isArray(list) ? list : list.data || [];
    return data.map((e, i) => ({
      id: e.id,
      encrypted_id: e.encrypted_id,
      index: i + 1,
      form_number: e.form_number,
      student_id: e.user.id_number,
      user: e.user,
      prefect: e.prefect,
      created_at: e.created_at,
      confirmed_at: e.confirmed_at,
      rejected_at: e.rejected_at,
      rejected_reason: e.rejected_reason,
      revoked_at: e.revoked_at,
      date_to: e.date_to,
      note: e.note,
      archived_at: e.archived_at,
      status: statusFor(e),
      school_year_semester: e.school_year_semester,
      confirmed_school_year_semester: e.confirmed_school_year_semester,
      rejected_school_year_semester: e.rejected_school_year_semester,
      revoked_school_year_semester: e.revoked_school_year_semester,
    }));
  }, [list]);

  // Everyone but the prefect (e.g. a student on their own profile) gets a
  // compact table about the forms themselves: no student columns, no reason.
  const compact = usr?.role !== "sub_admin";

  const columns = useMemo(() => {
    if (compact) return compactColumns(events);

    const cols = [
      { field: "index", headerName: "#", width: 60 },
      { field: "form_number", headerName: "Reference No.", width: 130 },
      { field: "student_id", width: 180, headerName: "Student ID" },
      {
        field: "student",
        headerName: "Student",
        flex: 1,
        minWidth: 250,
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
              <div className="flex flex-col text-[0.8em] justify-center leading-tight">
                <b>{`${user.profile?.first_name ?? ""} ${user.profile?.middle_name ?? ""} ${user.profile?.last_name ?? ""}`}</b>
                <span>{showUserType(user)}</span>
                {params.row.rejected_reason && (
                  <span className="text-gray-500">Reason: {params.row.rejected_reason}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        renderCell: (params) => (
          <div className="h-full flex items-center">
            <StatusPill status={params.row.status} />
          </div>
        ),
      },
      {
        field: "created_at",
        headerName: "Submitted Since",
        width: 180,
        renderCell: (params) => (
          <div className="text-[0.8em] leading-tight py-2">
            <div>{readableDate(params.value)} ({readableTime(params.value)})</div>
            {formatSchoolYearSemester(params.row.school_year_semester) && (
              <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.school_year_semester)}</div>
            )}
          </div>
        ),
      },
    ];

    if (noted) {
      cols.push({
        field: "confirmed_at",
        headerName: "Approved Since",
        width: 180,
        renderCell: (params) => (
          <div className="text-[0.8em] leading-tight py-2">
            <div>{params.value ? `${readableDate(params.value)} (${readableTime(params.value)})` : "N/A"}</div>
            {formatSchoolYearSemester(params.row.confirmed_school_year_semester) && (
              <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.confirmed_school_year_semester)}</div>
            )}
          </div>
        ),
      });
    }

    if (urlStatus === "rejected") {
      cols.push({
        field: "rejected_at",
        headerName: "Rejected Since",
        width: 180,
        renderCell: (params) => (
          <div className="text-[0.8em] leading-tight py-2">
            <div>{params.value ? `${readableDate(params.value)} (${readableTime(params.value)})` : "N/A"}</div>
            {formatSchoolYearSemester(params.row.rejected_school_year_semester) && (
              <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.rejected_school_year_semester)}</div>
            )}
          </div>
        ),
      });
    }

    if (urlStatus === "revoked") {
      cols.push({
        field: "revoked_at",
        headerName: "Revoked Since",
        width: 180,
        renderCell: (params) => (
          <div className="text-[0.8em] leading-tight py-2">
            <div>{params.value ? `${readableDate(params.value)} (${readableTime(params.value)})` : "N/A"}</div>
            {formatSchoolYearSemester(params.row.revoked_school_year_semester) && (
              <div className="text-[0.75em] text-gray-500">{formatSchoolYearSemester(params.row.revoked_school_year_semester)}</div>
            )}
          </div>
        ),
      });
    }

    cols.push({
      field: "actions",
      type: "actions",
      headerName: "Action",
      width: 250,
      headerAlign: 'start',
      align: 'start',
      renderCell: (params) => {
        const row = params.row;
        return (
          <div className="flex flex-wrap gap-2">
            <ActionBtn
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => events(row.encrypted_id, "view")}
            >
              View
            </ActionBtn>

            {row.status === "pending" && usr.role === "sub_admin" && (
              <>
                <ActionBtn
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => events(row.id, "confirm")}
                >
                  Approve
                </ActionBtn>
                <ActionBtn
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => events(row.id, "cancel")}
                >
                  Reject
                </ActionBtn>
              </>
            )}

          </div>
        );
      },
    });

    return cols;
  }, [events, noted, usr, urlStatus, compact]);

  // Phones show cards that grow with the page instead of scrolling inside
  // a fixed-height box.
  const isMobile = useIsMobile();

  if (!list) {
    return (
      <div className="flex justify-center items-center w-full py-10">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0, overflow: isMobile ? "visible" : "hidden", height: isMobile ? "auto" : 550, p: 2, bgcolor: "var(--dm-surface, white)", borderRadius: 2 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSizeOptions={[5, 10, 25]}
        pagination
        disableRowSelectionOnClick
        hideFooterSelectedRowCount
        getRowHeight={() => 'auto'}
        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
        localeText={{ noRowsLabel: "No Absent Forms Found" }}
        showToolbar
        // Phones: student + "#ref · status"; tap for dates and actions.
        // (compact: "Ref. No. …" · status instead of the student.)
        mobileSummary={(row) => compact ? ({
          name: `Ref. No. ${row.form_number}`,
          role: statusLabel(row.status),
          hide: ["form_number", "status"],
        }) : ({
          name: [row.user?.profile?.first_name, row.user?.profile?.middle_name, row.user?.profile?.last_name].filter(Boolean).join(" "),
          role: `#${row.form_number} · ${statusLabel(row.status)}`,
          picture: row.user?.profile?.profile_picture,
          sex: row.user?.profile?.sex,
          hide: ["student", "form_number"],
        })}
      />
    </Box>
  );
};

export default AbsentFormRequestList;
