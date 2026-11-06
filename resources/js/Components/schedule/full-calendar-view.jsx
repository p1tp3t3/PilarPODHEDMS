import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import axios from "axios"
import { useCallback, useRef, useState } from "react"
import { APPOINTMENT_STATUS } from "@/others/appointment-status"
import { IconButton, Button, ToggleButtonGroup, ToggleButton, TextField, Chip } from "@mui/material"
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

    // Status filter (the clickable legend). Applied to the events already
    // loaded for the visible range, so changing it sends no new request;
    // refreshKey (a new or changed appointment) starts a fresh cache.
    const [statusFilter, setStatusFilter] = useState("all")
    const statusRef = useRef("all")
    const cacheRef = useRef(null)
    const refreshRef = useRef(refreshKey)
    refreshRef.current = refreshKey

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
        // The month on screen (currentStart), not getApi(): the ref isn't
        // set yet on the first call, which left the month box empty.
        const d = info.view.currentStart
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

    // Kept the same function between renders: FullCalendar refetches
    // whenever `events` changes, so a new function on every render (e.g.
    // selecting a day re-renders the page) sent the request again. Now it
    // only fetches when the visible range changes, or on refreshKey.
    const fetchEvents = useCallback((info, successCallback, failureCallback) => {
        const show = (data) => successCallback(statusRef.current === "all"
            ? data
            : data.filter((e) => e.extendedProps?.display_status === statusRef.current))
        const key = `${refreshRef.current}|${info.startStr}|${info.endStr}`
        if (cacheRef.current?.key === key) return show(cacheRef.current.data)
        axios
            .get("/calendar/appointment/events", {
                params: { start: info.startStr, end: info.endStr },
            })
            .then((res) => {
                cacheRef.current = { key, data: res.data }
                show(res.data)
            })
            .catch((err) => failureCallback(err))
    }, [])

    const pickStatus = (key) => {
        setStatusFilter(key)
        statusRef.current = key
        getApi()?.refetchEvents()
    }

    const btnSx = {
        color: "var(--dm-text-muted, #374151)",
        border: "1px solid var(--dm-border-strong, #d1d5db)",
        borderRadius: "0.5rem",
        "&:hover": { backgroundColor: "var(--dm-raised, #f3f4f6)" },
    }

    const nav = (
        <div className="flex items-center gap-1">
            <IconButton size="small" onClick={goPrev} sx={btnSx} aria-label="Previous">
                <ChevronLeft size="0.8em" />
            </IconButton>
            <Button onClick={goToday} size="small" variant="outlined" sx={{ ...btnSx, textTransform: "none", px: 2 }}>
                Today
            </Button>
            <IconButton size="small" onClick={goNext} sx={btnSx} aria-label="Next">
                <ChevronRight size="0.8em" />
            </IconButton>
        </div>
    )

    return (
        <div className="w-full grid gap-4">
            {/* Desktop: month + status filter on the left; navigation, month
                picker and view on the right. Phones: month with ‹ Today › on one
                row, the status chips in a swipeable row, then picker + view. */}
            <div className="grid gap-3 md:flex md:flex-wrap md:items-start md:justify-between">
                <div className="min-w-0 grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <h1 className="text-[1.15em] md:text-[1.3em] font-bold text-gray-900 leading-tight truncate">{title}</h1>
                        <div className="md:hidden shrink-0">{nav}</div>
                    </div>
                    {/* Legend = status filter: click one to show only those, All for everything. */}
                    <div
                        className="flex items-center gap-1.5 overflow-x-auto md:flex-wrap md:overflow-visible -mx-1 px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        role="group"
                        aria-label="Filter by status"
                    >
                        {[["all", { label: "All" }], ...Object.entries(APPOINTMENT_STATUS)].map(([key, meta]) => {
                            const active = statusFilter === key
                            return (
                                <Chip
                                    key={key}
                                    label={meta.label}
                                    size="small"
                                    clickable
                                    onClick={() => pickStatus(key)}
                                    aria-pressed={active}
                                    color={active ? "primary" : "default"}
                                    variant={active ? "filled" : "outlined"}
                                    icon={meta.color ? (
                                        <span
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: meta.color, boxShadow: active ? "0 0 0 2px #fff" : "none" }}
                                        />
                                    ) : undefined}
                                    sx={{ flexShrink: 0, fontWeight: active ? 600 : 500, "& .MuiChip-icon": { ml: 1, mr: -0.25 } }}
                                />
                            )
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden md:block">{nav}</div>
                    <TextField
                        type="month"
                        size="small"
                        value={yearMonth}
                        onChange={handlePickMonth}
                        inputProps={{ "aria-label": "Go to month" }}
                        sx={{ flex: { xs: 1, md: "none" }, width: { md: "11rem" }, minWidth: 0, "& .MuiInputBase-input": { py: 0.9, fontSize: "0.85em", cursor: "pointer" } }}
                    />
                    <ToggleButtonGroup value={view} exclusive size="small" onChange={changeView} sx={{ flexShrink: 0 }}>
                        <ToggleButton value="dayGridMonth" sx={{ textTransform: "none", px: { xs: 1.5, md: 2 } }}>
                            Month
                        </ToggleButton>
                        <ToggleButton value="timeGridWeek" sx={{ textTransform: "none", px: { xs: 1.5, md: 2 } }}>
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
                    dateClick={(info) => onSlotSelect(info.date, info.jsEvent, info.dayEl)}
                    dayCellClassNames={dayCellClassNames}
                    dayMaxEvents={3}
                    // Coloured blocks (status colour, white text); month view would
                    // otherwise draw timed events as a dot, which the CSS hides.
                    eventDisplay="block"
                    eventTextColor="#ffffff"
                    eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
                />
            </div>
        </div>
    )
}

export default FullCalendarView
