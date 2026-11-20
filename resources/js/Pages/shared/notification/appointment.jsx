import SetAppointmentReasonModal from "@/Components/modal/submission-form/set-appointment-reason-modal";
import { useReload } from "@/context-provider/reload-provider";
import AuthLayout from "@/Layouts/auth-layout";
import { useMarkNotificationRead } from "@/others/hooks/use-mark-notification-read";
import { AppointmentService } from "@/others/services/appointment-service";
import { showOutputModal, showWarningModal, readableDate, readableTime, parseNotifContent } from "@/others/function";
import { useState } from "react";
import { CalendarClock } from "lucide-react";
import NotifDetailCard, { NotifRow } from "@/Components/other/notif-detail-card"
import { Box, Button, Typography } from "@mui/material";
import { Head } from "@inertiajs/react";

const AppointmentNotification = (props) => {
  useMarkNotificationRead();

  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const { loadRegister } = useReload();
  const [data, setData] = useState(props.notif);
  const [data2, setData2] = useState({
    user_id: props.auth.user.id,
    reason: ''
  })

  const content = parseNotifContent(data.content);

  const isAppointment = data.notif_type === "appointment";
  // Scheduled reminders (app:notify-appointment-sched-command) are
  // informational only: no Accept/Decline and no status badge.
  const isReminder = content.type === "reminder";
  const isPending = !isReminder && content.accept === null;

  // Student who receives the notification
  const receiver =
    props.auth.user.id === data.receiver_id &&
    props.auth.user.role !== "sub_admin";

  // Prefect who sent the notification
  const isSender = props.auth.user.id === data.receiver_id;

  // ----------------------------------------
  // FIXED TITLE LOGIC FOR BOTH SCHED & RESCHED
  // ----------------------------------------
  const getMessageTitle = () => {
    if (isReminder) return content.receiver_notif_message;

    const studentName = `${data.sender?.profile?.first_name ?? ""} ${data.sender?.profile?.middle_name ?? ""} ${data.sender?.profile?.last_name ?? ""}`.replace(/\s+/g, " ").trim();
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
      <Head title="Appointment Notification" />
      {/* DECLINE MODAL */}
      <SetAppointmentReasonModal
        close={reasonModalOpen}
        closeModal={setReasonModalOpen}
        pd={["px-10", "py-7"]}
        isEnableOuterClose={true}
        user_id={props.auth.user.user_id}
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
          tone={isPending || isReminder ? "default" : content.accept ? "success" : "danger"}
          title={getMessageTitle()}
          timestamp={`${readableDate(data.created_at)} • ${readableTime(data.created_at)}`}
          statusBadge={
            !isPending && !isReminder
              ? {
                  label: content.accept ? "Accepted" : "Declined",
                  tone: content.accept ? "success" : "danger",
                }
              : null
          }
          actions={
            isAppointment && isPending && receiver ? (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  disableElevation
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                  onClick={() => setReasonModalOpen(true)}
                >
                  {content.type === "sched"
                    ? "Decline Appointment"
                    : "Decline Reschedule"}
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  disableElevation
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                  onClick={() =>
                    handleResponse("accept", content.type, data.id)
                  }
                >
                  {content.type === "sched"
                    ? "Accept Appointment"
                    : "Accept Reschedule"}
                </Button>
              </>
            ) : null
          }
        >
          <Box sx={{ px: 2, py: 0.5, border: 1, borderColor: "divider", borderRadius: 2 }}>
            <NotifRow label="Date of Appointment">{content.date_appoint}</NotifRow>
            <NotifRow label="Time">{content.time_appoint}</NotifRow>
          </Box>
          {content.reason && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "text.secondary", mb: 0.5 }}>
                Reason
              </Typography>
              <Typography sx={{ fontSize: "0.95rem", color: "text.primary", lineHeight: 1.65 }}>{content.reason}</Typography>
            </Box>
          )}
        </NotifDetailCard>
    </>
  );
}

AppointmentNotification.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default AppointmentNotification;
