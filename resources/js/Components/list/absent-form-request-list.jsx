import React, { useContext, useMemo, useState, useEffect } from "react";
import { Box } from "@mui/material";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import ProfilePic from "../other/profile-pic";
import ActionBtn from "../button/action-btn";
import {
  getProfilePic,
  readableDate,
  readableTime,
  showUserType,
  toTitleCase,
} from "../../others/function";
import AuthContext from "@/context-provider/auth-provider";
import ListSkeleton from "../reload/list-skeleton";
import { Folder } from "lucide-react";

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  expired: "bg-gray-200 text-gray-700",
  noted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  revoked: "bg-gray-200 text-gray-700",
};

const statusFor = (e) => {
  if (e.revoked_at) return "revoked";
  if (e.rejected_at) return "rejected";
  if (e.confirmed_at) return "noted";
  if (new Date(e.date_to) < new Date()) return "expired";
  return "pending";
};

const AbsentFormRequestList = ({ list = null, events, noted = false }) => {
  const { usr } = useContext(AuthContext);

  // Flatten data for DataGrid
  const rows = useMemo(() => {
    if (!list) return [];
    const data = Array.isArray(list) ? list : list.data || [];
    return data.map((e, i) => ({
      id: e.id,
      index: i + 1,
      form_number: e.form_number,
      student_id: e.user.id_number,
      user: e.user,
      created_at: e.created_at,
      confirmed_at: e.confirmed_at,
      rejected_at: e.rejected_at,
      rejected_reason: e.rejected_reason,
      revoked_at: e.revoked_at,
      date_to: e.date_to,
      note: e.note,
      archived_at: e.archived_at,
      status: statusFor(e),
    }));
  }, [list]);

  const columns = useMemo(() => {
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
                <div className="flex items-center gap-2 flex-wrap">
                  <b>{`${user.profile?.first_name ?? ""} ${user.profile?.middle_name ?? ""} ${user.profile?.last_name ?? ""}`}</b>
                  <span className={`px-2 py-0.5 rounded-full text-[0.75em] font-medium ${STATUS_STYLES[params.row.status]}`}>
                    {toTitleCase(params.row.status)}
                  </span>
                </div>
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
        field: "created_at",
        headerName: "Submitted Since",
        width: 180,
        renderCell: (params) => (
          <span className="text-[0.8em]">
            {readableDate(params.value)} ({readableTime(params.value)})
          </span>
        ),
      },
    ];

    if (noted) {
      cols.push({
        field: "confirmed_at",
        headerName: "Noted Since",
        width: 180,
        renderCell: (params) => (
          <span className="text-[0.8em]">
            {params.value ? `${readableDate(params.value)} (${readableTime(params.value)})` : "N/A"}
          </span>
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
              onClick={() => events(row.id, "view")}
            >
              View
            </ActionBtn>

            {(row.status === "pending" || row.status === "expired") && usr.role === "sub_admin" && (
              <>
                <ActionBtn
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => events(row.id, "confirm")}
                >
                  Note
                </ActionBtn>
                <ActionBtn
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => events(row.id, "cancel")}
                >
                  Reject
                </ActionBtn>
              </>
            )}

            {usr.role === "sub_admin" && !row.archived_at && (
              <ActionBtn
                className="bg-amber-600 text-white hover:bg-amber-700"
                onClick={() => events(row.id, "archive")}
              >
                Archive
              </ActionBtn>
            )}
          </div>
        );
      },
    });

    return cols;
  }, [events, noted, usr]);

  if (!list) {
    return (
      <div className="flex justify-center items-center w-full py-10">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex justify-center items-center w-full py-10 text-gray-600 text-center">
        <div className="text-[4em]">
          <Folder size="1em" />
        </div>
        <div>No Absent Forms Found</div>
      </div>
    );
  }

  return (
    <Box sx={{ width: "100%", height: 550, p: 2, bgcolor: "white", borderRadius: 2, overflowX: "auto" }}>
      <Box sx={{ minWidth: "900px" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[5, 10, 25]}
          pagination
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
          showToolbar
        />
      </Box>
    </Box>
  );
};

export default AbsentFormRequestList;
