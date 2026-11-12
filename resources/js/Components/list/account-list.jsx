import SearchUserBar from "../input/search-user-bar";
import { useEffect, useState, useContext } from "react";
import ProfilePic from "../other/profile-pic";
import AuthContext from "@/context-provider/auth-provider";
import "./style.css";
import {
  checkActiveStatus,
  getProfilePic,
  readableActiveDuration,
  readableDate,
  readableTime,
  showOutputModal,
  showUserType,
  showWarningModal,
  toTitleCase, profileUrl, studentProgram, studentYearLevel } from "../../others/function";
import Switch from "../button/switch-btn";
import { AccountService } from "@/others/services/account-service";
import { Link } from "@inertiajs/react";
import ActionBtn from "../button/action-btn";
import { DataGrid } from "@/Components/other/data-grid";
import { Box } from "@mui/material";
import { X, Check } from "lucide-react";
import LiveActiveSince from "@/Components/other/live-active-since";
import { LabeledCheckbox, SelectCheckbox, setRowsChecked } from "@/Components/input/select-checkbox";

// Columns shown in place of "Role" when the list is filtered to one role.
// Stored names like "program_head" are title-cased; "IT Staff" etc. kept as is.
const label = (v) => (!v ? "N/A" : String(v).includes("_") || String(v) === String(v).toLowerCase() ? toTitleCase(String(v)).replace(/_/g, " ") : v);
const textColumn = (field, headerName, get, minWidth = 120) => ({
  field,
  headerName,
  flex: 1,
  minWidth,
  valueGetter: (_, row) => get(row) ?? "N/A",
});
const ROLE_COLUMNS = {
  student: [
    textColumn("program_name", "Program", (row) => studentProgram(row), 150),
    textColumn("year_level", "Year Level", (row) => studentYearLevel(row)),
  ],
  program_head: [
    textColumn("program_name", "Programs", (row) => (row.teaching?.programs_handled ?? []).map((p) => p.name).join(", ") || row.teaching?.program?.name, 150),
  ],
  faculty: [
    textColumn("program_name", "Program", (row) => row.teaching?.program?.name, 150),
  ],
  non_teaching_staff: [
    textColumn("position", "Position", (row) => label(row.non_teaching_staff?.position)),
  ],
  parent: [
    textColumn("parent_role", "Parent Role", (row) => label(row.parent?.parent_role)),
  ],
};

const AccountList = (props) => {
  const { isUserOnline } = useContext(AuthContext);
  const [isSearchFocus, focusSearch] = useState(false),
    [search, setSearch] = useState(""),
    [accountList, setAccountList] = useState(props.row.data),
    [select, enableSelect] = useState(false),
    [activate, setActivate] = useState(false);

  const handleSearch = (e) => setSearch(e.target.value);

  const actionAll = (e, type) => {
    const status = e.target.checked ? 1 : 0;

    const checkboxes = document.querySelectorAll(
      'input[name="selected-row"]:checked'
    );
    const ids = Array.from(checkboxes).map((checkbox) => checkbox.value);
    const param = new URLSearchParams(window.location.search);
    if (type === "activate") {
      AccountService.activateAll(ids, status, param.get("page") || 1, updateList);
      setActivate(status);
    } else {
      showWarningModal(
        "Are You Sure You Want To Delete The Selected Accounts?",
        "Delete Accounts",
        "Cancel",
        () => {
          const data = { user_ids: ids };
          props.reload(
            true,
            "text-wait",
            "Deleting Selected Accounts is Processing"
          );
          AccountService.deleteAccount(
            data,
            () => {
              props.reload(true, "");
              showOutputModal("Accounts Deleted Successfully", "s", () => {
                props.reload(false);
                window.location.reload();
              });
            },
            () => {
              props.reload(true, "");
              showOutputModal("Error Deleting Accounts", "e", () =>
                props.reload(false)
              );
            }
          );
        }
      );
    }
  };

  const updateList = (list) => {
    setAccountList(list.account_list.data);
  };

  const selectAllRow = (e) => {
    setRowsChecked(e.target.checked);
  };

  return (
    <div className="w-full account-list">
      <div className="w-full">
        {/* === ACTION HEADER: page filters (left), bulk-select controls (right) === */}
        <div className={`w-full flex flex-wrap gap-3 py-5 ${props.filters ? "items-start sm:items-center" : "items-center"}`}>
          {props.filters && <div className="min-w-0 flex-1">{props.filters}</div>}
          <div className={`flex flex-wrap items-center gap-3 ${props.filters ? "ml-auto" : ""}`}>
          {select && (
            <div className="flex gap-5 items-center flex-wrap">
              <LabeledCheckbox label="Select All" id="select-all" onChange={selectAllRow} className="text-[0.8em]" />
              <Switch
                checked={activate}
                effect={["bg-red-600", "bg-green-600"]}
                onChange={(e) => actionAll(e, "activate")}
              />
              <div className="text-[0.8em]">
                <ActionBtn
                  onClick={(e) => actionAll(e, "delete")}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </ActionBtn>
              </div>
            </div>
          )}
          <ActionBtn
            className="bg-blue-700 hover:bg-blue-800"
            onClick={() => enableSelect(!select)}
          >
            {select ? <X size={14} /> : <Check size={14} />}
          </ActionBtn>
          </div>
        </div>

        <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm min-w-0">
          <div className="w-full px-5 py-3 min-w-0">
            {/* === DATAGRID === */}
        <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
          <DataGrid
            rows={accountList ?? []}
            getRowId={(row) => row.id}
            mobileSummary={(row) => ({
              name: [row.profile?.first_name, row.profile?.middle_name, row.profile?.last_name].filter(Boolean).join(" "),
              role: showUserType(row),
              picture: row.profile?.profile_picture,
              sex: row.profile?.sex,
              hide: ["user", "role"],
            })}
            disableRowSelectionOnClick
            localeText={{ noRowsLabel: "No Accounts Found" }}
            showToolbar
            hideFooterSelectedRowCount
            pagination
            initialState={{ pagination: { paginationModel: {  page: 0, pageSize: 20 } } }}
            pageSizeOptions={[20, 50, 100]}
            sx={{
              "& .MuiDataGrid-toolbarContainer": {
                minHeight: "2.75rem",
                paddingBlock: "0.4rem",
              },
            }}
            columns={[
              {
                field: "index",
                headerName: "#",
                width: 50,
                sortable: false,
                renderCell: (params) =>
                  `${params.api.getRowIndexRelativeToVisibleRows(params.id) + 1}.`,
              },
              { field: "id_number", headerName: "User ID", flex: 0.7, minWidth: 90 },
              {
                field: "user",
                headerName: "User",
                flex: 2,
                minWidth: 200,
                sortable: false,
                filterable: true,
                renderCell: ({ row }) => (
                  <div className="flex items-center gap-3 h-full">
                    <ProfilePic
                      size={2}
                      src={getProfilePic(row.profile?.profile_picture, row.profile?.sex)}
                      showActive={true}
                      isActive={isUserOnline(row.id) || checkActiveStatus(row.last_seen)}
                      activeSize={0.8}
                    />
                    <div className="flex flex-col justify-center leading-tight">
                      <div className="text-[0.8em] font-bold">
                        {row.profile?.first_name} {row.profile?.middle_name} {row.profile?.last_name}
                      </div>
                      <div className="text-[0.7em] break-all">{row.username}</div>
                    </div>
                  </div>
                ),
              },
              // A role filter swaps the Role column for that role's own details.
              ...(ROLE_COLUMNS[props.selectedRole] ?? [{
                field: "role",
                headerName: "Role",
                flex: 1, minWidth: 120,
                renderCell: ({ row }) => toTitleCase(row.role).replace("_", " "),
              }]),
              {
                field: "created_at",
                headerName: "Registered Since",
                flex: 1, minWidth: 130,
                renderCell: ({ row }) => (
                  <div className="flex flex-col leading-tight text-[0.85em]">
                    <span>{readableDate(row.created_at)}</span>
                    <span className="text-[0.85em] text-gray-500">{readableTime(row.created_at)}</span>
                  </div>
                ),
              },
              {
                field: "last_seen",
                headerName: "Active Since",
                flex: 1, minWidth: 130,
                renderCell: ({ row }) => (
                  <LiveActiveSince userId={row.id} lastSeen={row.last_seen} />
                ),
              },
              {
                field: "actions",
                type: 'actions',
                headerName: "Action",
                width: props.onEditEnrollment ? 340 : 230,
                sortable: false,
                headerAlign: 'left',
                align: 'left',
                renderCell: (params) => (
                  <ActionCell
                    row={params.row}
                    select={select}
                    deleteUser={props.deleteUser}
                    onEditEnrollment={props.onEditEnrollment}
                  />
                ),
              },
            ]}
          />
        </Box>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================
// ACTION CELL COMPONENT
// ========================
const ActionCell = ({ row, select, deleteUser, onEditEnrollment }) => {
  const [activate, setActivate] = useState(row.activate);

  useEffect(() => {
    setActivate(row.activate);
  }, [row.activate]);

  const handleToggle = (e) => {
    AccountService.toggleActivation(row.username, Number(e.target.checked));
    setActivate(e.target.checked);
  };

  return (
    <div className="flex gap-1 items-center h-full pr-3">
      <Link href={`${profileUrl(row)}`}>
        <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700">View</ActionBtn>
      </Link>

      {/* Student filter only (the same green as the other edit buttons). */}
      {onEditEnrollment && row.role === "student" && !select && (
        <ActionBtn className="bg-green-600 text-white hover:bg-green-700" onClick={() => onEditEnrollment(row)}>
          Edit Program
        </ActionBtn>
      )}

      {select ? (
        <SelectCheckbox value={row.id} label={`Select ${row.username ?? "account"}`} />
      ) : (
        <Switch
          checked={activate}
          onChange={handleToggle}
          effect={["bg-red-600", "bg-green-600"]}
        />
      )}

      {!select && (
        <ActionBtn
          onClick={() => deleteUser(row)}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          Delete
        </ActionBtn>
      )}
    </div>
  );
};

export default AccountList;
