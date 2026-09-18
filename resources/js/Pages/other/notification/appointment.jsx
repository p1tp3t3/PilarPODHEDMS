import SetAppointmentReasonModal from "@/Components/modal/submission-form/set-appointment-reason-modal";
import { useReload } from "@/context-provider/reload-provider";
import AuthLayout from "@/Layouts/auth-layout";
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read";
import { AppointmentService } from "@/others/services/appointment-service";
import { showOutputModal, showWarningModal, readableDate, readableTime, parseNotifContent } from "@/others/function";
import { useState } from "react";
import { CalendarClock } from "lucide-react";
import NotifDetailCard from "@/Components/other/notif-detail-card";

const AppointmentNotification = (props) => {
  useMarkNotificationRead();

  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const { loadRegister } = useReload();
  const [data, setData] = useState(props.notif);
  const [data2, setData2] = useState({
    user_id: props.user.id,
    reason: ''
  })

  const content = parseNotifContent(data.content);

  const isAppointment = data.notif_type === "appointment";
  const isPending = content.accept === null;

  // Student who receives the notification
  const receiver =
    props.user.id === data.receiver_id &&
    props.user.role !== "sub_admin";

  // Prefect who sent the notification
  const isSender = props.user.id === data.receiver_id;

  // ----------------------------------------
  // FIXED TITLE LOGIC FOR BOTH SCHED & RESCHED
  // ----------------------------------------
  const getMessageTitle = () => {
    const studentName = `${data.sender.profile?.first_name ?? ""} ${data.sender.profile?.middle_name ?? ""} ${data.sender.profile?.last_name ?? ""}`.replace(/\s+/g, " ").trim();
    const responded = content.accept !== null;
    const isAccepted = content.accept === true;
    const typeText =
      content.type === "sched" ? "appointment" : "rescheduled appointment";

    // -----------------------------
    // RECEIVER VIEW (student)
    // -----------------------------
    if (receiver) {
      if (responded) {
        return isAccepted
          ? `You have accepted the ${typeText}.`
          : `You have declined the ${typeText}.`;
      }
      return content.receiver_notif_message; // original message
    }

    // -----------------------------
    // SENDER VIEW (prefect)
    // -----------------------------
    if (isSender) {
      if (!responded) {
        return content.sender_notif_message; // original scheduling message
      }

      return isAccepted
        ? `${studentName} has accepted the ${typeText}.`
        : `${studentName} has declined the ${typeText}.`;
    }

    return "Appointment Notification";
  };


  // ----------------------------------------
  // ACCEPT / DECLINE LOGIC
  // ----------------------------------------
  const handleResponse = (action, type, notifId) => {
    const isAccept = action === "accept";
    const isSched = type === "sched"; // sched or resched

    const title = isAccept
      ? isSched
        ? "Accept the Appointment?"
        : "Accept the Rescheduled Appointment?"
      : isSched
      ? "Decline the Appointment?"
      : "Decline the Rescheduled Appointment?";

    const buttonText = isAccept
      ? isSched
        ? "Accept Appointment"
        : "Accept Reschedule"
      : isSched
      ? "Decline Appointment"
      : "Decline Reschedule";

    const successMsg = isAccept
      ? isSched
        ? "Appointment Accepted Successfully"
        : "Rescheduled Appointment Accepted Successfully"
      : isSched
      ? "Appointment Declined Successfully"
      : "Rescheduled Appointment Declined Successfully";

    const errorMsg = isAccept
      ? isSched
        ? "Error Accepting Appointment"
        : "Error Accepting Reschedule"
      : isSched
      ? "Error Declining Appointment"
      : "Error Declining Reschedule";

    // ACCEPT LOGIC
    if (isAccept) {
      showWarningModal(
        title,
        buttonText,
        "Cancel",
        () => {
          loadRegister(true, "text-wait", "Processing Request...");

          AppointmentService.respondWithSetter(
            {
              id: notifId,
              action: "accept",
              appointment_id: content?.id ?? 0,
            },
            (response) => setData(response.notif),
            () => {
              showOutputModal(
                successMsg,
                's',
                () => {
                  loadRegister(false)
                  window.location.reload()
                }
              )
            },
            () => {
              showOutputModal(
                errorMsg,
                'e',
                () => {
                  loadRegister(false)
                }
              )
            }
          );
        }
      );
      return;
    }

    // DECLINE → show modal
    setReasonModalOpen(true);
  };

  return (
    <>
      {/* DECLINE MODAL */}
      <SetAppointmentReasonModal
        close={reasonModalOpen}
        closeModal={setReasonModalOpen}
        pd={["px-10", "py-7"]}
        isEnableOuterClose={true}
        user_id={props.user.user_id}
        data={data2}
        setData={setData2}
        decline_title={
          content.type === "sched"
            ? "Are You Sure You Want to Decline the Appointment?"
            : "Are You Sure You Want to Decline the Rescheduled Appointment?"
        }
        decline_btn={
          content.type === "sched"
            ? "Decline Appointment"
            : "Decline Reschedule"
        }
        sendData={() => {
          const successMsg =
            content.type === "sched"
              ? "Appointment Declined Successfully"
              : "Rescheduled Appointment Declined Successfully";

          const errorMsg =
            content.type === "sched"
              ? "Error Declining Appointment"
              : "Error Declining Reschedule";

          loadRegister(
            true,
            "text-wait",
            content.type === "sched"
              ? "Declining Appointment..."
              : "Declining Rescheduled Appointment..."
          );

          AppointmentService.respondWithSetter(
            {
              id: props.notif.id,
              reason: data2.reason,
              action: "decline",
            },
            (response) => setData(response.notif),
            () => {
              showOutputModal(
                successMsg,
                's',
                () => {
                  loadRegister(false)
                  window.location.reload()
                }
              )
            },
            () => {
              showOutputModal(
                errorMsg,
                'e',
                () => {
                  loadRegister(false)
                }
              )
            }
          );
        }}
      />

        <NotifDetailCard
          icon={CalendarClock}
          tone={isPending ? "default" : content.accept ? "success" : "danger"}
          title={getMessageTitle()}
          timestamp={`${readableDate(data.created_at)} • ${readableTime(data.created_at)}`}
          statusBadge={
            !isPending
              ? {
                  label: content.accept ? "Accepted" : "Declined",
                  tone: content.accept ? "success" : "danger",
                }
              : null
          }
          actions={
            isAppointment && isPending && receiver ? (
              <>
                <button
                  className="px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-full transition-colors"
                  onClick={() => setReasonModalOpen(true)}
                >
                  {content.type === "sched"
                    ? "Decline Appointment"
                    : "Decline Reschedule"}
                </button>

                <button
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-full transition-colors"
                  onClick={() =>
                    handleResponse("accept", content.type, data.id)
                  }
                >
                  {content.type === "sched"
                    ? "Accept Appointment"
                    : "Accept Reschedule"}
                </button>
              </>
            ) : null
          }
        >
          <div className="grid gap-3">
            <div className="flex justify-between text-[0.92em]">
              <span className="text-gray-500">Date of Appointment</span>
              <span className="font-medium text-gray-800">{content.date_appoint}</span>
            </div>
            <div className="flex justify-between text-[0.92em]">
              <span className="text-gray-500">Time</span>
              <span className="font-medium text-gray-800">{content.time_appoint}</span>
            </div>
            {content.reason && (
              <p className="text-gray-600 italic text-[0.9em] pt-2 border-t border-gray-50">
                “{content.reason}”
              </p>
            )}
          </div>
        </NotifDetailCard>
    </>
  );
}

AppointmentNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default AppointmentNotification;
