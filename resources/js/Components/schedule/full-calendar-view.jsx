import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import axios from "axios"
import { useRef, useState } from "react"
import { IconButton, Button, ToggleButtonGroup, ToggleButton, TextField } from "@mui/material"
import "./full-calendar-view.css"
import { ChevronLeft, ChevronRight } from "lucide-react"

/**
 * Google-Calendar-style month/week view for appointments. Events are
 * fetched on demand for whatever range FullCalendar is currently showing
 * (it re-calls this every time the user navigates or switches view). The
 * header controls are real MUI components driving FullCalendar's
 * imperative API, since FullCalendar's own toolbar isn't MUI.
 */
const FullCalendarView = ({ onEventClick, onSlotSelect, refreshKey, selectedDate }) => {
    const calendarRef = useRef(null)
    const [title, setTitle] = useState("")
    const [view, setView] = useState("dayGridMonth")
    const [yearMonth, setYearMonth] = useState("")

    const getApi = () => calendarRef.current?.getApi()

    const goPrev = () => getApi()?.prev()
    const goNext = () => getApi()?.next()
    const goToday = () => getApi()?.today()
    const changeView = (_, newView) => {
        if (!newView) return
        setView(newView)
        getApi()?.changeView(newView)
    }
    const handleDatesSet = (info) => {
        setTitle(info.view.title)
        const d = getApi()?.getDate()
        if (d) setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    }
    const handlePickMonth = (e) => {
        const [year, month] = e.target.value.split("-")
        if (!year || !month) return
        setYearMonth(e.target.value)
        getApi()?.gotoDate(new Date(Number(year), Number(month) - 1, 1))
    }

    const isSameDay = (a, b) => a && b
        && a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate()

    const dayCellClassNames = (arg) => (
        selectedDate && isSameDay(arg.date, new Date(selectedDate)) ? ["fc-day-selected"] : []
    )

    const fetchEvents = (info, successCallback, failureCallback) => {
        axios
            .get("/calendar/appointment/events", {
                params: { start: info.startStr, end: info.endStr },
            })
            .then((res) => successCallback(res.data))
            .catch((err) => failureCallback(err))
    }

    const btnSx = {
        color: "#374151",
        border: "1px solid #d1d5db",
        borderRadius: "0.5rem",
        "&:hover": { backgroundColor: "#f3f4f6" },
    }

    return (
        <div className="w-full grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <IconButton size="small" onClick={goPrev} sx={btnSx}>
                        <ChevronLeft size="0.8em" />
                    </IconButton>
                    <IconButton size="small" onClick={goNext} sx={btnSx}>
                        <ChevronRight size="0.8em" />
                    </IconButton>
                    <Button
                        onClick={goToday}
                        size="small"
                        variant="outlined"
                        sx={{ ...btnSx, textTransform: "none", px: 2 }}
                    >
                        Today
                    </Button>
                    <TextField
                        type="month"
                        size="small"
                        value={yearMonth}
                        onChange={handlePickMonth}
                        sx={{ "& .MuiInputBase-input": { py: 0.9, fontSize: "0.85em", cursor: "pointer" } }}
                    />
                    <h1 className="text-[1.3em] font-bold text-gray-900 ml-2">{title}</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 text-[0.8em] text-gray-600">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]"></span>
                            Accepted
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]"></span>
                            Pending
                        </div>
                    </div>

                    <ToggleButtonGroup value={view} exclusive size="small" onChange={changeView}>
                        <ToggleButton value="dayGridMonth" sx={{ textTransform: "none", px: 2 }}>
                            Month
                        </ToggleButton>
                        <ToggleButton value="timeGridWeek" sx={{ textTransform: "none", px: 2 }}>
                            Week
                        </ToggleButton>
                    </ToggleButtonGroup>
                </div>
            </div>

            <div className="w-full appointment-fullcalendar">
                <FullCalendar
                    key={refreshKey}
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={false}
                    datesSet={handleDatesSet}
                    height="auto"
                    slotMinTime="07:00:00"
                    slotMaxTime="19:00:00"
                    events={fetchEvents}
                    eventClick={(info) => onEventClick(info.event)}
                    dateClick={(info) => onSlotSelect(info.date, info.jsEvent)}
                    dayCellClassNames={dayCellClassNames}
                    dayMaxEvents={3}
                    eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
                />
            </div>
        </div>
    )
}

export default FullCalendarView
