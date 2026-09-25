import AuthLayout from "@/Layouts/auth-layout";
import { useState } from "react";
import FullCalendarView from "@/Components/schedule/full-calendar-view";
import AppointmentEventModal from "@/Components/modal/view/appointment-event-modal";
import ViewDayAppointmentsModal from "@/Components/modal/view/view-day-appointments-modal";
import { AppointmentService } from "@/others/services/appointment-service";
import AppointmentModal from "@/Components/modal/submission-form/set-appointment-modal";
import { useReload } from "@/context-provider/reload-provider";
import { showWarningModal, showOutputModal } from "@/others/function";
import { Paper, Popover, List, ListItemButton } from "@mui/material";
import { CalendarPlus, Eye } from "lucide-react";

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

  const [dayMenuPos, setDayMenuPos] = useState(null);
  const [dayMenuDate, setDayMenuDate] = useState(null);
  const [viewDayModal, openViewDayModal] = useState(false);

  const { loadRegister } = useReload();

  const openAppointmentModal = (clickedDate) => {
    openAppoint(true);
    setDate(clickedDate);
    setSelectedUser(null);
    setAppointmentId("");
    setFormLabel(`Schedule for ${new Date(clickedDate).toDateString()} Appointment`);
  };

  // A day can have 2+ students scheduled, so clicking a day now anchors a
  // small menu (Schedule / View Appointments) instead of jumping straight
  // into the schedule form. Anchored by cursor coordinates rather than a
  // DOM element, since FullCalendar's day/slot cells aren't stable anchor
  // targets across its month/week views.
  const handleDaySelect = (clickedDate, jsEvent) => {
    setDayMenuDate(clickedDate);
    setDayMenuPos(jsEvent ? { top: jsEvent.clientY, left: jsEvent.clientX } : null);
  };

  const closeDayMenu = () => setDayMenuPos(null);

  const handleScheduleFromMenu = () => {
    closeDayMenu();
    openAppointmentModal(dayMenuDate);
  };

  const handleViewAppointmentsFromMenu = () => {
    closeDayMenu();
    openViewDayModal(true);
  };

  const isPastDate = (d) => {
    if (!d) return false;
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return day < today;
  };
  const dayMenuIsPast = isPastDate(dayMenuDate);

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

  const handleMarkAttendance = (appointmentId, attendanceStatus) => {
    AppointmentService.markAttendance(
      appointmentId,
      attendanceStatus,
      () => {
        // Reflect the change immediately in the open modal, then refetch
        // the calendar feed so the badge stays correct after it's closed.
        setSelectedEvent((prev) =>
          prev ? { ...prev, extendedProps: { ...prev.extendedProps, attendance_status: attendanceStatus } } : prev
        );
        setRefreshKey((k) => k + 1);
      },
      error
    );
  };

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
        onMarkAttendance={handleMarkAttendance}
      />

      <ViewDayAppointmentsModal
        close={viewDayModal}
        closeModal={openViewDayModal}
        date={dayMenuDate}
        onSelectEvent={handleEventClick}
        onScheduleNew={openAppointmentModal}
      />

      <Popover
        open={Boolean(dayMenuPos)}
        anchorReference="anchorPosition"
        anchorPosition={dayMenuPos || { top: 0, left: 0 }}
        onClose={closeDayMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <List sx={{ minWidth: "13rem", py: 0.5 }}>
          <ListItemButton
            onClick={handleScheduleFromMenu}
            disabled={dayMenuIsPast}
            sx={{ gap: 1, fontSize: "0.85em" }}
          >
            <CalendarPlus size={16} /> Schedule an Appointment
          </ListItemButton>
          <ListItemButton onClick={handleViewAppointmentsFromMenu} sx={{ gap: 1, fontSize: "0.85em" }}>
            <Eye size={16} /> View Appointments
          </ListItemButton>
        </List>
        {dayMenuIsPast && (
          <p className="text-[0.75em] text-gray-500 px-4 pb-2 -mt-1 max-w-[13rem]">
            Can't schedule an appointment for a past date.
          </p>
        )}
      </Popover>

      <div className="w-full py-4">
        <div className="flex flex-col pb-3 sm:flex-row w-full justify-between items-start gap-3">
          <h1 className="text-[1.3em] sm:text-[1.5em] font-bold">APPOINTMENT</h1>
        </div>

        <Paper elevation={2} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: "0.5rem", width: "100%" }}>
          <FullCalendarView
            refreshKey={refreshKey}
            onEventClick={handleEventClick}
            onSlotSelect={handleDaySelect}
            selectedDate={dayMenuDate}
          />
        </Paper>
      </div>
    </>
  );
};

PrefectAppointment2.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default PrefectAppointment2;
