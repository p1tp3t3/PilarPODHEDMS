import SearchBar from "@/Components/input/search-bar";
import { ProgramService } from "@/others/services/program-service";
import { getProgramLogo, readableDate, readableTime, showWarningModal } from "@/others/function";
import { useState } from "react";
import { DataGrid } from "@/Components/other/data-grid";
import { AlertCircle } from "lucide-react";
import ActionBtn from "@/Components/button/action-btn";
import TabSwitcher from "@/Components/other/tab-switcher";
import { router } from "@inertiajs/react";
import { PageActions } from "@/context-provider/page-title-provider";

const ManageProgram = ({ list, original_list, events, reload, setter }) => {
  const [search, setSearch] = useState('');
  // Active programs by default; archived ones sit in their own tab.
  const [view, setView] = useState("active");
  const all = list ?? [];
  const rows = all.filter((p) => (view === "archived") === !!p.archived_at);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);

    if (!value.toLowerCase().trim()) {
      setter(original_list);
      return;
    }

    const filtered = list.filter(item => {
      const acronym = (item.code ?? "").toLowerCase();
      const name = (item.name ?? "").toLowerCase();

      return (
        acronym.includes(value.toLowerCase()) ||
        name.includes(value.toLowerCase())
      );
    });

    setter(filtered);
  };

  const deleteProgram = (row) => {
    showWarningModal(
      `Are You Sure You Want To Delete ${row.name}?`,
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

  // A program with users or records is archived instead of deleted.
  const archiveProgram = (row) => {
    showWarningModal(
      `Archive ${row.name}? It won't be offered for new accounts or enrollments. Its users and records stay, and you can restore it from the Archived tab.`,
      "Archive Program",
      "Cancel",
      () => {
        reload(true, "text-wait", "Archiving Program...");
        ProgramService.archive(
          row.id,
          setter,
          () => reload(true, "success", "Program Archived"),
          (e) => reload(true, "error", e.response?.data?.message ?? "Something went wrong.")
        );
      }
    );
  };

  const restoreProgram = (row) => {
    showWarningModal(
      `Restore ${row.name}? It will be offered for new accounts and enrollments again.`,
      "Restore Program",
      "Cancel",
      () => {
        reload(true, "text-wait", "Restoring Program...");
        ProgramService.restore(
          row.id,
          setter,
          () => reload(true, "success", "Program Restored"),
          (e) => reload(true, "error", e.response?.data?.message ?? "Something went wrong.")
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
            <div className="text-[0.8em] font-bold flex items-center gap-1.5">
              {row.code}
              {row.archived_at && (
                <span className="px-1.5 py-0.5 rounded-full text-[0.85em] font-semibold bg-gray-200 text-gray-600">Archived</span>
              )}
            </div>
            <div className="text-[0.7em]">{row.name}</div>
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
            onClick={() => router.visit(`/super-admin/program/${row.encrypted_id}/users`)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            View
          </ActionBtn>
          {/* Archived: read-only until restored. */}
          {!row.archived_at && (
          <ActionBtn
            onClick={() => events[0]("program", "edit", row)}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            Edit
          </ActionBtn>
          )}
          {/* Archived: Restore. With users/records: Archive. Without: Delete. */}
          {row.archived_at ? (
          <ActionBtn
            onClick={() => restoreProgram(row)}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Restore
          </ActionBtn>
          ) : row.has_records ? (
          <ActionBtn
            onClick={() => archiveProgram(row)}
            className="bg-amber-600 text-white hover:bg-amber-700"
            title="This program has users or records, so it can be archived but not deleted."
          >
            Archive
          </ActionBtn>
          ) : (
          <ActionBtn
            onClick={() => deleteProgram(row)}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </ActionBtn>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full grid gap-3 min-w-0">
    {/* Tabs with Add Program at the end of the row (desktop/tablet). */}
    <div className="flex flex-col-reverse md:flex-row md:items-end gap-3 min-w-0">
      <div className="min-w-0 flex-1"><TabSwitcher value={view} onChange={setView} tabs={[{ key: "active", label: "Active" }, { key: "archived", label: "Archived" }]} /></div>
      <PageActions />
    </div>
    <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm min-w-0">
      <div className="w-full px-5 py-3 min-w-0 overflow-hidden">
        <DataGrid
          rows={rows}
          getRowId={(row) => row.id}
          columns={columns}
          pagination
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
          pageSizeOptions={[20, 50, 100]}
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          showToolbar
          localeText={{ noRowsLabel: "No programs found" }}
        />
      </div>
    </div>
    </div>
  );
};

export default ManageProgram;
