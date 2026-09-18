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

const Row = ({ data }) => {
    const violation = data.offense?.violation;
    const occurrences = data.occurrence_list ?? [];

    const name = violation?.violation_name ?? "Unknown Violation";
    const count = data.total_occurrence;
    const occurrenceLabel = `${count} Offense${count > 1 ? "s" : ""}`;

    return (
        <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition">

            {/* TITLE */}
            <h2 className="font-semibold text-[1.05em] text-gray-900 mb-1">
                {name}
            </h2>

            {/* OCCURRENCE */}
            <p className="text-gray-600 text-sm mb-3">
                <b>Occurrences:</b> {occurrenceLabel}
            </p>

            {/* PER-OCCURRENCE BREAKDOWN */}
            <div className="grid gap-2">
                {occurrences.map((o) => (
                    <div key={o.occurrence} className="bg-blue-50 border border-blue-300 px-3 py-2 rounded text-sm text-blue-900">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <b>{ordinal(o.occurrence)} Offense</b>
                            <span className="text-xs text-blue-700">
                                {o.date ? `${readableDate(o.date)} (${readableTime(o.date)})` : "N/A"}
                            </span>
                        </div>
                        {o.penalty ? (
                            <p className="mt-1">
                                {o.penalty.description}
                                <span className="text-xs text-blue-700">
                                    {" "}(Based on {ordinal(o.penalty.occurrence_used)} occurrence)
                                </span>
                            </p>
                        ) : (
                            <p className="mt-1 text-gray-600 italic">No penalty defined for this occurrence.</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentViolationOccurenceList;
