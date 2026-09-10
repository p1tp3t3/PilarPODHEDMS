import AuthLayout from "@/Layouts/auth-layout";
import { useState } from "react";
import FullCalendarView from "@/Components/schedule/full-calendar-view";
import AppointmentEventModal from "@/Components/modal/view/appointment-event-modal";
import { AppointmentService } from "@/others/services/appointment-service";
import AppointmentModal from "@/Components/modal/submission-form/set-appointment-modal";
import { useReload } from "@/context-provider/reload-provider";
import { showWarningModal, showOutputModal } from "@/others/function";
import { Paper } from "@mui/material";

const PrefectAppointment2 = (props) => {
  const [appointmentId, setAppointmentId] = useState("");
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState(null);

  const [appoint, openAppoint] = useState(false);
  const [formLabel, setFormLabel] = useState("");

  const [valid, isValid] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [eventModal, openEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { loadRegister } = useReload();

  const openAppointmentModal = (clickedDate) => {
    openAppoint(true);
    setDate(clickedDate);
    setSelectedUser(null);
    setAppointmentId("");
    setFormLabel(`Schedule for ${new Date(clickedDate).toDateString()} Appointment`);
  };

  const openReschedAppointmentModal = (d, reschedUser, id) => {
    openAppoint(true);
    setDate(d);
    setSelectedUser([reschedUser]);
    setAppointmentId(id);
    setFormLabel(`Re-Schedule for ${new Date(d).toDateString()} Appointment`);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    openEventModal(true);
  };

  const handleReschedule = (d, user, id) => {
    openEventModal(false);
    openReschedAppointmentModal(d, user, id);
  };

  const handleCancel = (id) => {
    openEventModal(false);
    showWarningModal(
      "Are You Sure You Want To Cancel This Appointment?",
      "Cancel Appointment",
      "Close",
      () => {
        loadRegister(true, "text-wait", "Cancelling The Appointment.");
        AppointmentService.cancel(id, successCancel, error);
      }
    );
  };

  const successCancel = () => {
    loadRegister(true, "success", "Appointment Canceled Successfully");
    setRefreshKey((k) => k + 1);
  };
  const error = () => loadRegister(true, "error", "There was an Error. Please Try Again");

  return (
    <>
      <AppointmentModal
        label={formLabel}
        close={appoint}
        closeModal={openAppoint}
        pd={["px-5", "py-7"]}
        isEnableOuterClose={true}
        date={date}
        id={props.user.id}
        reload={(r, t, l) => {
          loadRegister(r, t, l);
          if (t === "") setRefreshKey((k) => k + 1);
        }}
        user_type={props.user.role}
        student_parent_list={props.student_parent_list}
        isValid={isValid}
        reschedUser={selectedUser}
        appointmentId={appointmentId}
        setReschedUser={setSelectedUser}
        setData={setData}
      />

      <AppointmentEventModal
        close={eventModal}
        closeModal={openEventModal}
        event={selectedEvent}
        onCancel={handleCancel}
        onReschedule={handleReschedule}
      />

      <div className="w-full py-4">
        <div className="flex flex-col pb-3 sm:flex-row w-full justify-between items-start gap-3">
          <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">APPOINTMENT</h1>
        </div>

        <Paper elevation={2} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: "0.5rem", width: "100%" }}>
          <FullCalendarView
            refreshKey={refreshKey}
            onEventClick={handleEventClick}
            onSlotSelect={openAppointmentModal}
          />
        </Paper>
      </div>
    </>
  );
};

PrefectAppointment2.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectAppointment2;
