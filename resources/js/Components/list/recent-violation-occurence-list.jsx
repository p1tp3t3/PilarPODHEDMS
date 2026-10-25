import { useEffect, useState } from "react";
import ListSkeleton from "../reload/list-skeleton";
import { ViolationService } from "@/others/services/violation-service";
import { ordinal, readableDate, readableTime } from "@/others/function";
import { TriangleAlert } from "lucide-react";

const RecentViolationOccurenceList = ({ user_id, list: listProp = null }) => {
    const [list, setList] = useState(listProp);

    useEffect(() => {
        // The profile controller now passes the occurrence list down as a
        // prop; only fall back to the API call when none is given.
        if (listProp != null) {
            setList(listProp);
            return;
        }

        ViolationService.getViolationOccurrenceList(user_id, setList);
    }, [user_id, listProp]);

    return (
        <div className="w-full grid gap-5">
            <div className="w-full grid gap-3">

                {/* LOADING */}
                {list === null && (
                    <div className="w-full h-[20rem] grid place-items-center">
                        <ListSkeleton rows={4} />
                    </div>
                )}

                {/* EMPTY */}
                {list !== null && list.length === 0 && (
                    <div className="w-full h-[20rem] grid place-items-center">
                        <div className="text-center text-gray-500 py-10">
                            <TriangleAlert size="2.5em" className="mx-auto mb-2" />
                            <h1 className="text-[1.2em] font-semibold">No Violations Found</h1>
                            <p className="text-[0.9em]">There are no recorded violations for this student.</p>
                        </div>
                    </div>
                )}

                {/* LIST */}
                {list !== null && list.length > 0 && (
                    list.map((e, i) => <Row key={i} data={e} />)
                )}

            </div>
        </div>
    );
};

// One violation's offenses as a vertical timeline: a numbered step per
// offense, joined by a line, newest at the bottom (highlighted).
const Row = ({ data }) => {
    const violation = data.offense?.violation;
    const occurrences = data.occurrence_list ?? [];

    const name = violation?.violation_name ?? "Unknown Violation";
    const count = data.total_occurrence;

    return (
        <div className="border border-gray-200 rounded-lg p-4 sm:p-5 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="font-semibold text-[1.05em] text-gray-900">{name}</h2>
                <span className="rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[0.75em] font-semibold">
                    {count} offense{count === 1 ? "" : "s"}
                </span>
            </div>

            <ol className="relative">
                {occurrences.map((o, i) => {
                    const last = i === occurrences.length - 1;
                    return (
                        <li key={o.occurrence} className="relative flex gap-3 sm:gap-4">
                            {/* step dot + connecting line */}
                            <div className="flex flex-col items-center">
                                <span className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-[0.75em] font-bold ${last ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-white text-blue-700 border-2 border-blue-300"}`}>
                                    {o.occurrence}
                                </span>
                                {!last && <span className="w-0.5 flex-1 bg-blue-300" />}
                            </div>

                            <div className={`flex-1 min-w-0 ${last ? "pb-0" : "pb-5"}`}>
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 pt-0.5">
                                    <p className={`text-[0.9em] font-semibold ${last ? "text-blue-800" : "text-gray-800"}`}>
                                        {ordinal(o.occurrence)} Offense
                                        {last && <span className="ml-2 text-[0.75em] font-medium text-blue-600">Latest</span>}
                                    </p>
                                    <span className="text-[0.75em] text-gray-500">
                                        {o.date ? `${readableDate(o.date)} (${readableTime(o.date)})` : "N/A"}
                                    </span>
                                </div>
                                {o.penalty ? (
                                    <p className="text-[0.85em] text-gray-600 mt-0.5">
                                        <span className="text-gray-400">Penalty:</span> {o.penalty.description}
                                        {/* Only when the penalty came from a different (lower) occurrence. */}
                                        {o.penalty.occurrence_used !== o.occurrence && (
                                            <span className="text-[0.85em] text-gray-400"> (uses the {ordinal(o.penalty.occurrence_used)} occurrence's penalty)</span>
                                        )}
                                    </p>
                                ) : (
                                    <p className="text-[0.85em] text-gray-400 italic mt-0.5">No penalty defined for this occurrence.</p>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};

export default RecentViolationOccurenceList;
