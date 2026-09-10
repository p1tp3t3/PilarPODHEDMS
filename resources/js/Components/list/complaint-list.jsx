import "./style.css";
import ProfilePic from "../other/profile-pic";
import { getProfilePic, readableDate, readableTime, showUserType, toTitleCase } from "../../others/function";
import { useMemo, useState } from "react";
import ListSkeleton from "../reload/list-skeleton";
import ActionBtn from "../button/action-btn";
import { DataGrid, GridActionsCellItem, GridToolbarContainer } from "@mui/x-data-grid";
import { Box, Button } from "@mui/material";
import { FolderOpen } from "lucide-react";

function CustomNoRowsOverlay() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        fontSize: "0.9em",
        color: "#555",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: "3em" }}>
        <FolderOpen size="1em" />
      </div>
      <div>No complaints found</div>
      <div style={{ fontSize: "0.8em", marginTop: 4 }}>
        Try changing the filter or check back later
      </div>
    </Box>
  );
}

const ComplaintList = ({
  list = null,
  style,
  type,
  user,
  setId,
  select,
  select2,
  actionEvent
}) => {

  const statusQuery = new URLSearchParams(window.location.search).get("status");

  // Convert list.data to rows
  const rows = list?.data?.map((e, i) => ({
    id: e.id,
    rowIndex: i,
    ...e,
    complainantText: e.user
    ? `${e.user.profile?.first_name || ""} ${e.user.profile?.middle_name || ""} ${e.user.profile?.last_name || ""} ${showUserType(e.user) || ""}`.trim()
    : toTitleCase(e.complainant_name || ""),
  })) || [];
  

  // Define columns
  const columns = useMemo(() => {
    const cols = [
      {
        field: "rowIndex",
        headerName: "#",
        width: 50,
        renderCell: (params) => <span>{params.value + 1}.</span>,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "complaint_number",
        headerName: "Reference No.",
        width: 130,
      },
    ];

    if (type === "prefect" && statusQuery === "ongoing") {
      cols.push({
        field: "case_number",
        headerName: "Case",
        width: 120,
        renderCell: (params) => <span>Case No. {params.value}</span>,
      });
    }

    if (type === "prefect") {
  cols.push({
    field: "complainantText",
    headerName: "Complainant",
    width: 220,
    sortable: true,
  filterable: true,
  // Filter & sort will automatically use `row.complainantText`
  renderCell: (params) => {
    const obj = params.row;
    if (obj.user) {
      return (
        <div className="flex items-center gap-3 h-full">
          <ProfilePic size={1.9} src={getProfilePic(obj.user.profile?.profile_picture, obj.user.profile?.sex)} />
          <div className="flex flex-col justify-center leading-tight">
            <h1 className="text-[0.8em] font-bold">
              {`${obj.user.profile?.first_name ?? ""} ${obj.user.profile?.middle_name ?? ""} ${obj.user.profile?.last_name ?? ""}`}
            </h1>
            <p className="text-[0.7em]">
              {showUserType(obj.user)}
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <span className="text-[0.8em] flex items-center h-full">
          {toTitleCase(obj.complainant_name)}
        </span>
      );
    }
  },
  });
}


    cols.push(
      {
        field: "complaint_status",
        headerName: "Status",
        width: 120,
        align: 'start',
        headerAlign: 'start',
        renderCell: (params) => {
          const s = params.value;
          const bg =
            s === "rejected" ? "bg-red-500" :
            s === "pending" ? "bg-yellow-500" :
            s === "ongoing" ? "bg-orange-500" :
            s === "resolved" ? "bg-green-500" :
            s === "revoked" ? "bg-gray-500" : "";
          return (
            <span className={`px-2 py-1 text-white rounded-xl ${bg}`}>{toTitleCase(s)}</span>
          );
        },
      },
      {
        field: "created_at",
        headerName: "Reported Since",
        width: 200,
        renderCell: (params) => `${readableDate(params.value)} (${readableTime(params.value)})`,
      }
    );

    if (statusQuery === "ongoing" && type === 'prefect') {
      cols.push({
        field: "confirmed_at",
        headerName: "Confirmed Since",
        width: 200,
        renderCell: (params) => `${readableDate(params.value)} (${readableTime(params.value)})`,
      });
    }

    // Action column
    cols.push({
      field: "actions",
      type: "actions",
      headerName: "Action",
      width: 420,
      align: 'start',
      headerAlign: 'start',
      renderCell: (params) => {
        const obj = params.row;
        return (
            <div className="flex flex-wrap gap-2 items-center py-1">
                <ActionBtn
                onClick={() => setId(obj.id, "c")}
                className="bg-blue-600 text-white hover:bg-blue-700"
                >
                View
                </ActionBtn>

                {obj.complaint_status === "pending" && type === "prefect" && !select2 && (
                <>
                    <ActionBtn
                    onClick={() => actionEvent("confirm", obj.id)}
                    className="bg-green-600 text-white hover:bg-green-700"
                    >
                    Approve
                    </ActionBtn>
                    <ActionBtn
                    onClick={() => actionEvent("cancel", obj.id)}
                    className="bg-red-600 text-white hover:bg-red-700"
                    >
                    Reject
                    </ActionBtn>
                </>
                )}

                {obj.complaint_status === "rejected" && type === "prefect" && !select && !select2 && (
                <ActionBtn
                    onClick={() => actionEvent("reinstate", obj.id)}
                    className="bg-green-600 text-white hover:bg-green-700"
                >
                    Approve
                </ActionBtn>
                )}

                {obj.complaint_status === "ongoing" && type === "prefect" && !select && (
                <ActionBtn
                    onClick={() => setId(obj.id, "v", obj)}
                    className="bg-green-600 text-white hover:bg-green-700"
                >
                    Resolve
                </ActionBtn>
                )}
                {obj.complainant_id === user?.id && obj.complaint_status === "pending" && !obj.edited_at && (
                <ActionBtn
                    onClick={() => actionEvent("edit", obj.id)}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                    Edit
                </ActionBtn>
                )}

                {obj.complainant_id === user?.id && obj.complaint_status === "pending" && (
                <ActionBtn
                    onClick={() => actionEvent("revoke", obj.id)}
                    className="bg-gray-600 text-white hover:bg-gray-700"
                >
                    Revoke
                </ActionBtn>
                )}

                {type === "prefect" && !select && !select2 && !obj.archived_at && (
                <ActionBtn
                    onClick={() => actionEvent("archive", obj.id)}
                    className="bg-amber-600 text-white hover:bg-amber-700"
                >
                    Archive
                </ActionBtn>
                )}

                {select && (
                <input type="checkbox" value={obj.case_number} />
                )}
            </div>
            );
        }
    });

    return cols;
  }, [list, type, select, select2, user]);

  if (rows.length === 0) {
    return <CustomNoRowsOverlay />;
  }
  return (
    <>
      {list?.data ? (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
  <Box sx={{ minWidth: "1240px" }}>
  <DataGrid
    rows={rows}
    columns={columns}
    pagination
    disableSelectionOnClick
    hideFooterSelectedRowCount
    getRowHeight={() => 'auto'}
    getRowId={(row) => row.id}
    initialState={{
      pagination: { paginationModel: { pageSize: 20, page: 0 } }
    }}
    pageSizeOptions={[20, 50, 100, 200]}
    showToolbar
    components={{
        NoRowsOverlay: CustomNoRowsOverlay, // <- custom empty state
    }}
  />
  </Box>
</Box>

      ) : (
        <div className="flex justify-center items-center w-full">
          <div className="text-center py-10 text-[0.9em]">
            <ListSkeleton rows={5} />
          </div>
        </div>
      )}
    </>
  );
};

export default ComplaintList;
