import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { DataGrid } from "@/Components/other/data-grid";
import {
  readableDate,
  readableTime,
  toTitleCase,
} from "../../others/function";
import ActionBtn from "../button/action-btn";

const ParentRequestList = ({ list = null, paginate = true, event }) => {
  const data = paginate ? list || [] : list || [];

  const rows = useMemo(() => {
  return data.map((obj, i) => {
    return {
      i: i + 1,
      id: obj.id,
      name: obj.name,
      role: toTitleCase(JSON.parse(obj.parent_details).parent_role),
      parent_details: obj.parent_details,
      email: obj.email,
      reason: obj.reason,
      request_since: obj.created_at
    };
  });
}, [data]);


  const columns = [
    {
      field: "i",
      headerName: "#",
      width: 60,
    },
    {
      field: "name",
      headerName: "Parent Name",
      minWidth: 260,
    },
    {
      field: "role",
      headerName: "Role",
      width: 130,
    },
    {
      field: "request_since",
      headerName: "Request Since",
      width: 170,
      renderCell: (params) => (
            <div className="">{readableDate(params.value)} ({readableTime(params.value)})</div>
        ),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Action",
      width: 280,
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (
        <div className="flex flex-wrap gap-1 py-1">
            <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => event('v', params.row.id, params.row)}>
              View
            </ActionBtn>
            <ActionBtn className="bg-green-600 text-white hover:bg-green-700" onClick={() => event('a', params.row.id, params.row)}>
              Approve
            </ActionBtn>
            <ActionBtn className="bg-red-600 text-white hover:bg-red-700" onClick={() => event('r', params.row.id)}>
              Reject
            </ActionBtn>
        </div>
      ),
    },
  ];

  return (
    <Box
      className={"w-full px-5 py-3 bg-white rounded-md shadow-black/20 shadow-sm"}
      sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        disableRowSelectionOnClick
        hideFooterSelectedRowCount
        pagination
        pageSizeOptions={[20, 50, 100, 200]}
        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
        showToolbar
        getRowHeight={() => 'auto'}
        getRowId={(row) => row.id}
        localeText={{ noRowsLabel: "No Parent Requests Found" }}
      />
    </Box>
  );
};

export default ParentRequestList;
