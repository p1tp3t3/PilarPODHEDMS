import { useState } from "react";
import AuthLayout from "@/Layouts/auth-layout";
import RequestGatePassModal from "@/Components/modal/submission-form/request-gatepass-modal";
import EditGatePassModal from "@/Components/modal/submission-form/edit-gatepass-modal";
import { useReload } from "@/context-provider/reload-provider";
import { readableDate, readableTime, showWarningModal, toTitleCase } from "@/others/function";
import { GatePassService } from "@/others/services/gatepass-service";
import { Head, Link, router } from "@inertiajs/react";
import Btn from "@/Components/button/normal-btn";
import ActionBtn from "@/Components/button/action-btn";
import TabSwitcher from "@/Components/other/tab-switcher";
import { Clock, CheckCircle2, XCircle, Ban, FolderOpen } from "lucide-react";

// revoked_at is deliberately not one of these tab keys — the requester
// already knows they revoked their own request, so there's no need for a
// dedicated tab to browse those (unlike the prefect's review page).
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

const permissionLabel = (gp) => {
  const allowTo = JSON.parse(gp.allow_to || "[]");
  if (allowTo.length !== 2) {
    return allowTo[0] ?? "";
  }
  return toTitleCase(
    allowTo[0].replace("-", " ") + " and " + allowTo[1].replace("-", " ")
  );
};

const optionTab = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "expired", label: "Expired", icon: XCircle },
  { key: "rejected", label: "Rejected", icon: Ban },
];

const GatePass = (props) => {
  const [requestGatePass, openRequestGatePass] = useState(false);
  const [editGatePass, openEditGatePass] = useState(false);
  const [editData, setEditData] = useState(null);
  const [tab, setTab] = useState("pending");

  const { loadRegister } = useReload();

  const allGatePasses = props.user_gatepass.gatepass ?? [];
  const latestGatepass = allGatePasses[0];
  const shownGatepasses = allGatePasses.filter((gp) => gatePassStatusKey(gp) === tab);

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
            router.reload({ only: ["user_gatepass"] });
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

  return (
    <>
      <Head title="Gate Pass" />
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
      <div className="w-full py-10">
        <div className="w-full grid gap-10 relative">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <h1 className="text-[1.4em] font-bold">Gate Pass</h1>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              {canRequestNewGatePass(latestGatepass) && props.user.allow_gatepass && (
                <Btn onclick={() => openRequestGatePass(true)}>
                  Request Gate Pass
                </Btn>
              )}
              {props.user.user_type === "staff" &&
                props.user.staff.work_type === "guard" && (
                  <Link href="/gatepass-validation" className="text-blue-700">
                    <u>Open Gate Pass Verification</u>
                  </Link>
                )}
            </div>
          </div>

          {/* Tabs */}
          <div className="w-full grid gap-3">
            <div className="w-full bg-white rounded-t-md shadow-black/20 shadow-sm border-b border-gray-200 px-4 sm:px-6">
              <TabSwitcher tabs={optionTab} value={tab} onChange={setTab} />
            </div>

            <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm px-5 py-3">
              {shownGatepasses.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  <FolderOpen size="2.5em" className="mx-auto mb-2 opacity-60" />
                  <p>No {STATUS_META[tab].label.toLowerCase()} gate passes found.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {shownGatepasses.map((gp) => {
                    const status = STATUS_META[gatePassStatusKey(gp)];
                    return (
                      <div
                        key={gp.id}
                        className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-[0.9em]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-gray-800">
                            {readableDate(gp.created_at)} ({readableTime(gp.created_at)})
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[0.8em] font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="text-gray-600 mt-1">Reason: {gp.reason}</div>
                        {gp.confirmed_at && (
                          <div className="text-gray-600 mt-1">
                            Permission to {permissionLabel(gp)} the Campus — Expires{" "}
                            {readableDate(gp.date_expiration)} ({readableTime(gp.date_expiration)})
                          </div>
                        )}
                        {gp.rejected_reason && (
                          <div className="text-gray-600 mt-1">Rejection Reason: {gp.rejected_reason}</div>
                        )}
                        {gatePassStatusKey(gp) === "pending" && (
                          <div className="flex gap-2 mt-3">
                            {isEditable(gp) && (
                              <ActionBtn
                                className="bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => handleEdit(gp)}
                              >
                                Edit
                              </ActionBtn>
                            )}
                            <ActionBtn
                              className="bg-gray-600 hover:bg-gray-700"
                              onClick={() => handleRevoke(gp.id)}
                            >
                              Revoke
                            </ActionBtn>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

GatePass.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default GatePass;
