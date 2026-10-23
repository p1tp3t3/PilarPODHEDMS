import { readableDate, readableTime } from "../../others/function";
import { CalendarX, CalendarClock, Info, History } from "lucide-react";
import { Link } from "@inertiajs/react";
import { useState } from "react";

// Outcome of a past appointment, from its two status columns.
const outcome = (a) => {
    if (a.appointment_status === "rejected") return { label: "Rejected", cls: "bg-red-50 text-red-700" };
    if (a.appointment_status !== "accepted") return { label: "Not Confirmed", cls: "bg-gray-100 text-gray-600" };
    if (a.attendance_status === "present") return { label: "Attended", cls: "bg-green-50 text-green-700" };
    if (a.attendance_status === "absent") return { label: "Missed", cls: "bg-amber-50 text-amber-700" };
    return { label: "Not Marked", cls: "bg-gray-100 text-gray-600" };
};

// `previous` (optional): past appointments — when given, the panel gets an
// Upcoming / Previous switch.
const AppointmentScheduleList = ({ list = [], previous, showAction = false, events = () => {} }) => {
    const [view, setView] = useState("upcoming");
    const showingPrevious = previous !== undefined && view === "previous";
    const rows = showingPrevious ? previous : list;

    return (
        <div className="w-full h-[22rem] bg-white rounded-lg shadow-sm border border-gray-200">
            
            {/* Header */}
            <div
                className={`${
                    showAction
                        ? "pb-3"
                        : "py-[6px] text-[0.95em] border-b border-gray-300"
                } px-5`}
            >
                {previous === undefined ? (
                    <b>Upcoming Appointments</b>
                ) : (
                    <div className="flex items-center justify-between gap-3">
                        <b>{showingPrevious ? "Previous Appointments" : "Upcoming Appointments"}</b>
                        <div className="inline-flex rounded-md border border-gray-200 p-0.5 text-[0.8em]" role="tablist">
                            {[["upcoming", "Upcoming"], ["previous", "Previous"]].map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={view === key}
                                    onClick={() => setView(key)}
                                    className={`px-2.5 py-0.5 rounded font-semibold transition-colors ${view === key ? "bg-[#1E3A8A] text-white" : "text-gray-600 hover:bg-gray-100"}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="overflow-hidden overflow-y-auto h-[19rem] w-full flex flex-col px-5 pt-3">

                {rows.length !== 0 ? (
                    rows.map((e, i) => (
                        showingPrevious
                            ? <PreviousRow key={e.encrypted_id ?? i} data={e} />
                            : <Row key={i} events={events} data={e} showAction={showAction} />
                    ))
                ) : (
                    <div className="text-[1em] text-gray-500 w-full grid place-items-center h-full">
                        <div className="grid place-items-center">
                            <div className="text-[3.5em] text-gray-400 mb-2">
                                <CalendarX size="1em" />
                            </div>
                            <div className="text-gray-600">{showingPrevious ? "No Previous Appointments" : "No Appointments Yet"}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const PreviousRow = ({ data }) => {
    const o = outcome(data);
    return (
        <div className="border-gray-200 border-b py-3 px-2 flex items-center justify-between gap-3">
            <div className="flex gap-3 items-center min-w-0">
                <div className="text-gray-400 text-xl shrink-0">
                    <History size="1em" />
                </div>
                <div className="min-w-0">
                    <p className="text-[0.95em] font-semibold text-gray-800">{readableDate(data.date_time_appoint)}</p>
                    <p className="text-[0.75em] text-gray-600">
                        {readableTime(data.date_time_appoint)}
                        {data.appointment_number && <span className="text-gray-400"> · No. {data.appointment_number}</span>}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[0.72em] font-semibold px-2 py-0.5 rounded-full ${o.cls}`}>{o.label}</span>
                <Link href={`/appointment?view=${data.encrypted_id}`} className="text-[#1E3A8A] hover:text-[#162d66] text-lg" title="View details">
                    <Info size="1em" />
                </Link>
            </div>
        </div>
    );
};

const Row = ({ data, showAction, events }) => {
    return (
        <div className="border-gray-200 border-b py-3">

            <div className="flex flex-col gap-3 px-2">

                {/* Date + Time */}
                <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                        <div className="text-[#1E3A8A] text-xl">
                            <CalendarClock size="1em" />
                        </div>

                        <div>
                            <p className="text-[0.95em] font-semibold text-gray-800">
                                {readableDate(data.date_time_appoint)}
                            </p>
                            <p className="text-[0.75em] text-gray-600">
                                Starts at <span className="font-medium text-gray-700">{readableTime(data.date_time_appoint)}</span>
                            </p>
                        </div>
                    </div>

                    {/* View Icon */}
                    {showAction && (
                        <button
                            onClick={() => events("view", data.id)}
                            className="text-[#1E3A8A] hover:text-[#162d66] text-lg"
                        >
                            <Info size="1em" />
                        </button>
                    )}
                </div>

                {/* Action Buttons */}
                {showAction && (
                    <div className="flex justify-end gap-2 mt-1">

                        <button
                            type="button"
                            className="py-1 px-3 border border-red-600 text-red-600 text-[0.75em] font-semibold rounded-md hover:bg-red-600 hover:text-white transition"
                            onClick={() => events("cancel", data.id, data)}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="py-1 px-3 border border-blue-700 text-blue-700 text-[0.75em] font-semibold rounded-md hover:bg-blue-700 hover:text-white transition"
                            onClick={() => events("resched", data.id, data)}
                        >
                            Re-Schedule
                        </button>

                    </div>
                )}

            </div>
        </div>
    );
};

export default AppointmentScheduleList;
