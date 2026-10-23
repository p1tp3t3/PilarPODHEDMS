import { readableDate, readableTime, toTitleCase } from "@/others/function";
import ListSkeleton from "../reload/list-skeleton";
import { TriangleAlert } from "lucide-react";

const IncidentList = ({ list = null, isIncident }) => {
    return (
        <div className="w-full grid gap-5">
            <div className="w-full grid gap-3">
                {list != null ? (
                    list.length !== 0 ? (
                        list.map((e, i) => (
                            <Row key={i} data={e} isIncident={isIncident} />
                        ))
                    ) : (
                        <div className="w-full h-[20rem] grid place-items-center">
                            <div className="text-center text-gray-500 py-10">
                                <TriangleAlert size="2.5em" className="mb-2" />
                                <h1 className="text-[1.2em] font-semibold">
                                    No {isIncident ? "Incidents" : "Violations"} Found
                                </h1>
                                <p className="text-[0.9em]">
                                    There are no recorded{" "}
                                    {isIncident ? "incidents" : "violations"} for this student.
                                </p>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="w-full h-[20rem] grid place-items-center">
                        <ListSkeleton rows={4} />
                    </div>
                )}
            </div>
        </div>
    );
};

const Row = ({ data, isIncident }) => {
    const complaint = data.complaint ?? {};

    // ALL violations from the backend
    const offenses = data.offenses ?? [];

    return (
        <div className="w-full bg-white shadow-sm rounded-md border border-gray-200">
            <div className="px-4 sm:px-6 py-4 flex flex-col gap-4">

                {/* HEADER */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[0.9em]">

                    <span className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-[0.8em] whitespace-nowrap">
                        Case No. {complaint.id ?? data.complaint_id}
                    </span>

                    <b className="text-[1em] break-words text-gray-800">
                        {isIncident
                            ? toTitleCase(complaint.incident)
                            : offenses.length > 0
                                ? `${offenses.length} Violation(s)`
                                : "No Violations Issued"}
                    </b>
                </div>

                {/* DATE + TIME */}
                <div className="text-[0.85em] text-gray-600">
                    {readableDate(complaint.created_at)} • {readableTime(complaint.created_at)}
                </div>

                {/* VIOLATIONS LIST */}
                {!isIncident && offenses.length > 0 && (
                    <div className="grid gap-3">
                        <p className="text-[0.8em] font-semibold text-gray-700">
                            Violations:
                        </p>

                        <div className="grid gap-2">
                            {offenses.map((off, index) => {
                                const v = off.violation;

                                const status = v?.offense_status
                                    ? "Major Offense"
                                    : "Minor Offense";

                                const statusColor = v?.offense_status
                                    ? "bg-red-600"
                                    : "bg-yellow-500";

                                return (
                                    <div
                                        key={index}
                                        className="flex justify-between items-center bg-gray-50 border rounded-md px-3 py-2"
                                    >
                                        <span className="text-[0.85em] text-gray-800">
                                            {toTitleCase(v?.violation_name ?? "Unknown Violation")}
                                        </span>

                                        <span
                                            className={`${statusColor} text-white px-3 py-1.5 rounded-full text-[0.75em] whitespace-nowrap`}
                                        >
                                            {status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* PREFECT REMARKS */}
                {/* Only sent to the prefect. */}
                {!isIncident && data.incident_summary && (
                    <div className="grid gap-2">
                        <p className="text-[0.8em] font-semibold text-gray-700">
                            Prefect&apos;s Remarks:
                        </p>
                        <div className="bg-gray-50 border rounded-md px-3 py-2 text-[0.85em] text-gray-700 h-[8.5rem] overflow-y-auto">
                            {data.incident_summary ?? "No remarks provided"}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


export default IncidentList;
