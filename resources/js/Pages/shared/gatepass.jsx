import SchoolYearSemesterFilter from "@/Components/input/school-year-semester-filter"
import SingleRowNotice from "@/Components/other/single-row-notice"
import { useState, useEffect } from "react";
import AuthLayout from "@/Layouts/auth-layout";
import PageLayout from "@/Layouts/page-layout";
import RequestGatePassModal from "@/Components/modal/submission-form/request-gatepass-modal";
import EditGatePassModal from "@/Components/modal/submission-form/edit-gatepass-modal";
import ViewGatePassModal from "@/Components/modal/view/view-gatepass-modal";
import { useReload } from "@/context-provider/reload-provider";
import { readableDate, readableTime, showWarningModal, toTitleCase } from "@/others/function";
import { GatePassService } from "@/others/services/gatepass-service";
import { Head, Link, router } from "@inertiajs/react";
import Btn from "@/Components/button/normal-btn";
import ActionBtn from "@/Components/button/action-btn";
import TabSwitcher from "@/Components/other/tab-switcher";
import { List, Clock, CheckCircle2, XCircle, Ban, Undo2, DoorOpen } from "lucide-react";
import { DataGrid } from "@/Components/other/data-grid";
import StatusPill from "@/Components/list/status-pill";

const STATUS_META = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  expired: { label: "Expired", className: "bg-gray-200 text-gray-600" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  revoked: { label: "Revoked", className: "bg-gray-200 text-gray-600" },
};

const gatePassStatusKey = (gp) => {
  if (gp.revoked_at) return "revoked";
  if (gp.rejected_at) return "rejected";
  if (!gp.confirmed_at) return "pending";
  if (new Date(gp.date_expiration) > new Date()) return "approved";
  return "expired";
};

const isRevocable = (gp) => !gp.confirmed_at && !gp.rejected_at && !gp.revoked_at;
const isEditable = (gp) => isRevocable(gp) && !gp.edited_at;

// A request only permanently blocks new ones while it's still pending or
// currently approved/unexpired — once it's rejected, revoked, or expired,
// the requester needs to be able to request again.
const canRequestNewGatePass = (gp) => {
  if (!gp) return true;
  if (gp.rejected_at || gp.revoked_at) return true;
  if (gp.confirmed_at && new Date(gp.date_expiration) <= new Date()) return true;
  return false;
};

const optionTab = [
  { key: "all", label: "All Gate Passes", icon: List },
  { key: "pending", label: "Pending", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "expired", label: "Expired", icon: XCircle },
  { key: "rejected", label: "Rejected", icon: Ban },
  { key: "revoked", label: "Revoked", icon: Undo2 },
];

const GatePass = (props) => {
  const [requestGatePass, openRequestGatePass] = useState(false);
  const [editGatePass, openEditGatePass] = useState(false);
  const [editData, setEditData] = useState(null);
  // The tab is ?status= in the URL; changing it is an Inertia visit and the
  // server sends only that status's gate passes.
  const [tab, setTab] = useState(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    return optionTab.some((t) => t.key === s) ? s : "all";
  });
  const changeTab = (key) => {
    if (key === tab) return;
    setTab(key);
    const params = new URLSearchParams(window.location.search);
    params.delete("view");
    params.delete("id");
    if (key === "all") params.delete("status");
    else params.set("status", key);
    const q = params.toString();
    router.get(`${window.location.pathname}${q ? `?${q}` : ""}`, {}, { preserveState: true, preserveScroll: true, only: ["user_gatepass"] });
  };
  const [viewId, setViewId] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewApproved, setViewApproved] = useState(false);

  const { loadRegister } = useReload();

  const shownGatepasses = props.user_gatepass?.gatepass ?? [];
  // Their latest request regardless of the tab and filters.
  const latestGatepass = props.latest_gatepass;

  // Lets the "My Records This Semester" dashboard modal deep-link straight
  // to a specific gate pass — opens the same view modal the prefect's page uses.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("view");
    if (!id) return;
    setViewId(id);
    setViewOpen(true);
  }, []);

  const handleRevoke = (id) => {
    showWarningModal(
      "Are You Sure You Want To Revoke This Gate Pass Request?",
      "Revoke Gate Pass",
      "Cancel",
      () => {
        loadRegister(true, "text-wait", "Revoking Gate Pass Is Processing");
        GatePassService.revoke(
          id,
          () => {},
          () => {
            loadRegister(true, "success", "Gate Pass Revoked Successfully");
            router.reload({ only: ["user_gatepass", "latest_gatepass"] });
          },
          () => loadRegister(true, "error", "Failed to Revoke Gate Pass")
        );
      }
    );
  };

  const handleEdit = (gp) => {
    setEditData(gp);
    openEditGatePass(true);
  };

  const columns = [
    {
      field: "index", headerName: "#", width: 60, sortable: false,
      renderCell: (params) => `${params.api.getRowIndexRelativeToVisibleRows(params.id) + 1}.`,
    },
    { field: "gatepass_number", headerName: "Gate Pass No.", width: 140 },
    {
      field: "created_at", headerName: "Submitted", flex: 1, minWidth: 170,
      renderCell: ({ row }) => (
        <div className="leading-tight">
          <div className="text-[0.85rem]">{readableDate(row.created_at)}</div>
          <div className="text-[0.72rem] text-gray-500">{readableTime(row.created_at)}</div>
        </div>
      ),
    },
    {
      field: "date_expiration", headerName: "Valid Until", flex: 1, minWidth: 170,
      renderCell: ({ row }) => row.confirmed_at && row.date_expiration ? (
        <div className="leading-tight">
          <div className="text-[0.85rem]">{readableDate(row.date_expiration)}</div>
          <div className="text-[0.72rem] text-gray-500">{readableTime(row.date_expiration)}</div>
        </div>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      // Same solid badge as the other record tables.
      field: "status", headerName: "Status", width: 130, sortable: false,
      valueGetter: (value, row) => STATUS_META[gatePassStatusKey(row)].label,
      renderCell: ({ row }) => <StatusPill status={gatePassStatusKey(row)} />,
    },
    {
      field: "actions", type: "actions", headerName: "Action", width: 220, align: "left", headerAlign: "left",
      renderCell: ({ row }) => (
        <div className="flex gap-2 items-center h-full">
          <ActionBtn className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => { setViewId(row.encrypted_id); setViewOpen(true); }}>View</ActionBtn>
          {isEditable(row) && (
            <ActionBtn className="bg-green-600 text-white hover:bg-green-700" onClick={() => handleEdit(row)}>Edit</ActionBtn>
          )}
          {isRevocable(row) && (
            <ActionBtn className="bg-red-600 text-white hover:bg-red-700" onClick={() => handleRevoke(row.id)}>Revoke</ActionBtn>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Head title="Gate Pass" />
      <ViewGatePassModal
        close={viewOpen}
        closeModal={setViewOpen}
        isEnableOuterClose={true}
        id={viewId}
        approved={viewApproved}
        setApprove={setViewApproved}
        events={() => {}}
      />
      <RequestGatePassModal
        close={requestGatePass}
        closeModal={openRequestGatePass}
        pd={["px-5", "py-7"]}
        isEnableOuterClose={true}
        user_id={props.user.id}
        reload={loadRegister}
      />
      <EditGatePassModal
        close={editGatePass}
        closeModal={openEditGatePass}
        pd={["px-5", "py-7"]}
        isEnableOuterClose={true}
        data={editData}
        reload={loadRegister}
      />
      <PageLayout actionsWithFilters
        title="GATE PASS"
        rightSideComponent={
          canRequestNewGatePass(latestGatepass) && props.user.allow_gatepass ? (
            <Btn onclick={() => openRequestGatePass(true)} icon={<DoorOpen size={19} />}>Request Gate Pass</Btn>
          ) : null
        }
      >
          <SchoolYearSemesterFilter schoolYears={props.school_years} />
          <TabSwitcher tabs={optionTab} value={tab} onChange={changeTab} />
          <SingleRowNotice noun="gate pass" />

          <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm px-5 py-3 min-w-0">
            <DataGrid
              rows={shownGatepasses}
              columns={columns}
              getRowId={(row) => row.id}
              rowHeight={60}
              pagination
              initialState={{ pagination: { paginationModel: { page: 0, pageSize: 20 } } }}
              pageSizeOptions={[20, 50, 100]}
              disableRowSelectionOnClick
              hideFooterSelectedRowCount
              showToolbar
              // Phones: the gate pass number and status; tap for the rest.
              mobileSummary={(row) => ({ name: `Gate Pass #${row.gatepass_number}`, role: STATUS_META[gatePassStatusKey(row)].label })}
              localeText={{ noRowsLabel: tab === "all" ? "No gate passes found." : `No ${STATUS_META[tab].label.toLowerCase()} gate passes found.` }}
            />
          </div>
      </PageLayout>
    </>
  );
};

GatePass.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default GatePass;
