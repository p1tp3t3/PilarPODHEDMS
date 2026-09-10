import SearchBar from "@/Components/input/search-bar";
import { ProgramService } from "@/others/services/program-service";
import { getProgramLogo, readableDate, readableTime, showWarningModal } from "@/others/function";
import { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { AlertCircle } from "lucide-react";
import ActionBtn from "@/Components/button/action-btn";
import { router } from "@inertiajs/react";

const ManageProgram = ({ list, original_list, events, reload, setter }) => {
  const [search, setSearch] = useState('');

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);

    if (!value.toLowerCase().trim()) {
      setter(original_list);
      return;
    }

    const filtered = list.filter(item => {
      const acronym = (item.name ?? "").toLowerCase();
      const name = (item.description ?? "").toLowerCase();

      return (
        acronym.includes(value.toLowerCase()) ||
        name.includes(value.toLowerCase())
      );
    });

    setter(filtered);
  };

  const deleteProgram = (row) => {
    showWarningModal(
      `Are You Sure You Want To Delete ${row.description}?`,
      "Delete Program",
      "Cancel",
      () => {
        reload(true, "text-wait", "Deleting Program...");
        ProgramService.delete(
          row.id,
          setter,
          () => {
            reload(true, "success", "Program Deleted Successfully");
          },
          (e) => {
            reload(true, "error", e.response.data.message);
          }
        );
      }
    );
  };

  const columns = [
    {
      field: "index",
      headerName: "#",
      width: 60,
      sortable: false,
      renderCell: (params) =>
        `${params.api.getRowIndexRelativeToVisibleRows(params.id) + 1}.`,
    },
    {
      field: "name",
      headerName: "Program",
      flex: 1,
      minWidth: 260,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex items-center gap-3 h-full">
          <img src={getProgramLogo(row.logo)} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          <div className="flex flex-col justify-center leading-tight">
            <div className="text-[0.8em] font-bold">{row.name}</div>
            <div className="text-[0.7em]">{row.description}</div>
          </div>
        </div>
      ),
    },
    {
      field: "created_at",
      headerName: "Added Since",
      width: 200,
      renderCell: (params) => `${readableDate(params.row.created_at)} (${readableTime(params.row.created_at)})`
    },
    {
      field: "users_count",
      headerName: "Users",
      width: 100,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: ({ row }) => row.users_count ?? 0,
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Action",
      width: 270,
      align: "left",
      headerAlign: "left",
      renderCell: ({ row }) => (
        <div className="flex gap-2 items-center h-full">
          <ActionBtn
            onClick={() => router.visit(`/super-admin/program/${row.id}/users`)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            View
          </ActionBtn>
          <ActionBtn
            onClick={() => events[0]("program", "edit", row)}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Edit
          </ActionBtn>
          <ActionBtn
            onClick={() => deleteProgram(row)}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </ActionBtn>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm overflow-x-auto">
      <div className="w-full px-5 py-3 min-w-[800px]">
        <DataGrid
          rows={list}
          getRowId={(row) => row.id}
          columns={columns}
          pagination
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
          pageSizeOptions={[20, 50, 100]}
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          showToolbar
          components={{
            NoRowsOverlay: () => (
              <div className="grid place-items-center h-full text-gray-600 py-10">
                <div className="text-[4em]">
                  <AlertCircle size="1em" />
                </div>
                <div><b>No Programs Found</b></div>
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
};

export default ManageProgram;
