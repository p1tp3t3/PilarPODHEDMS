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
  toTitleCase,
} from "../../others/function";
import Switch from "../button/switch-btn";
import { AccountService } from "@/others/services/account-service";
import { Link } from "@inertiajs/react";
import ActionBtn from "../button/action-btn";
import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { X, Check } from "lucide-react";
import AssignPositionModal from "../modal/submission-form/assign-position-modal";

const AccountList = (props) => {
  const { isUserOnline } = useContext(AuthContext);
  const [isSearchFocus, focusSearch] = useState(false),
    [search, setSearch] = useState(""),
    [accountList, setAccountList] = useState(props.row.data),
    [select, enableSelect] = useState(false),
    [activate, setActivate] = useState(false),
    [positionModal, openPositionModal] = useState(false),
    [positionRow, setPositionRow] = useState(null);

  const showPositionModal = (row) => {
    setPositionRow(row);
    openPositionModal(true);
  };

  const removePosition = (row) => {
    showWarningModal(
      `Are You Sure You Want to Remove ${row.non_teaching_staff?.position ?? "This"} Position From ${row.profile?.first_name}?`,
      "Remove Position",
      "Cancel",
      () => {
        AccountService.removeStaffPosition(
          { user_id: row.id },
          () => {
            showOutputModal("Position Removed Successfully", "s", () => window.location.reload());
          },
          (err) => showOutputModal(err.response?.data?.message ?? "Failed to remove position.", "e", () => {})
        );
      }
    );
  };

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
    const checked = e.target.checked;
    const checkboxes = document.querySelectorAll('input[name="selected-row"]');
    checkboxes.forEach((checkbox) => {
      checkbox.checked = checked;
    });
  };

  return (
    <div className="w-full account-list">
      <div className="w-full">
        {/* === ACTION HEADER === */}
        <div className="w-full flex flex-wrap items-center gap-3 py-5">
          <ActionBtn
            className="bg-blue-700 hover:bg-blue-800"
            onClick={() => enableSelect(!select)}
          >
            {select ? <X size={14} /> : <Check size={14} />}
          </ActionBtn>

          {select && (
            <div className="flex gap-5 items-center flex-wrap">
              <div className="flex gap-2 items-center text-[0.8em]">
                <input type="checkbox" id="select-all" onClick={selectAllRow} />
                <label htmlFor="select-all">Select All</label>
              </div>
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
        </div>

        <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm overflow-x-auto">
          <div className="w-full px-5 py-3 min-w-[1050px]">
            {/* === DATAGRID === */}
        <Box sx={{ width: "100%" }}>
          <DataGrid
            rows={accountList ?? []}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            showToolbar
            hideFooterSelectedRowCount
            pagination
            initialState={{ pagination: { paginationModel: {  page: 0, pageSize: 20 } } }}
            pageSizeOptions={[20, 50, 100, 200]}
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
              { field: "id_number", headerName: "User ID", width: 90 },
              {
                field: "user",
                headerName: "User",
                flex: 1,
                minWidth: 160,
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
                      <div className="text-[0.7em] text-gray-500">{showUserType(row)}</div>
                    </div>
                  </div>
                ),
              },
              {
                field: "role",
                headerName: "Role",
                width: 110,
                renderCell: ({ row }) => toTitleCase(row.role).replace("_", " "),
              },
              {
                field: "created_at",
                headerName: "Registered Since",
                width: 165,
                renderCell: ({ row }) =>
                  `${readableDate(row.created_at)} (${readableTime(row.created_at)})`,
              },
              {
                field: "last_seen",
                headerName: "Active Since",
                width: 260,
                renderCell: ({ row }) =>
                  row.last_seen
                    ? `${readableActiveDuration(row.last_seen)} • ${readableDate(row.last_seen)} (${readableTime(row.last_seen)})`
                    : "N/A",
              },
              {
                field: "actions",
                type: 'actions',
                headerName: "Action",
                width: 420,
                sortable: false,
                headerAlign: 'left',
                align: 'left',
                renderCell: (params) => (
                  <ActionCell
                    row={params.row}
                    select={select}
                    deleteUser={props.deleteUser}
                    assignPosition={showPositionModal}
                    removePosition={removePosition}
                  />
                ),
              },
            ]}
          />
        </Box>
          </div>
        </div>
      </div>
      <AssignPositionModal
        close={positionModal}
        closeModal={openPositionModal}
        isEnableOuterClose={true}
        data={positionRow}
        onDone={() => window.location.reload()}
      />
    </div>
  );
};

// ========================
// ACTION CELL COMPONENT
// ========================
const ActionCell = ({ row, select, deleteUser, assignPosition, removePosition }) => {
  const [activate, setActivate] = useState(row.activate);

  useEffect(() => {
    setActivate(row.activate);
  }, [row.activate]);

  const handleToggle = (e) => {
    AccountService.toggleActivation(row.username, Number(e.target.checked));
    setActivate(e.target.checked);
  };

  return (
    <div className="flex gap-2 items-center h-full">
      <Link href={`/profile/${row.username}`}>
        <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700">View</ActionBtn>
      </Link>

      {select ? (
        <input type="checkbox" name="selected-row" value={row.id} />
      ) : (
        <Switch
          checked={activate}
          onChange={handleToggle}
          effect={["bg-red-600", "bg-green-600"]}
        />
      )}

      {!select && row.role === "non_teaching_staff" && (
        <ActionBtn
          onClick={() => assignPosition(row)}
          className="bg-amber-600 text-white hover:bg-amber-700"
        >
          {row.non_teaching_staff?.position ?? "Set Position"}
        </ActionBtn>
      )}

      {!select && row.role === "non_teaching_staff" && row.non_teaching_staff &&
       !["Guard", "Guidance"].includes(row.non_teaching_staff.position) && (
        <ActionBtn
          onClick={() => removePosition(row)}
          className="bg-gray-500 text-white hover:bg-gray-600"
        >
          Clear
        </ActionBtn>
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
