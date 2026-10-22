import UpModal from "../up-modal"
import { FamilyService } from "@/others/services/family-service"
import { useState, useEffect, useMemo } from "react"
import { toTitleCase } from "@/others/function"
import { ViewModalSkeleton } from "./view-modal-parts"

const ViewParentRequestModal = (props) => {
    const [data, setData] = useState(null),
          [reload, setReload] = useState(false)

    useEffect(() => {
        if (props.close) {
            setReload(true)
            getParentReqInfo()
        } else {
            setReload(false)
            setData(null)
        }
    }, [props.close])

    const getParentReqInfo = () => {
        FamilyService.getParentRequestInfo(
            props.id,
            (res) => {
                setData(res)
                setReload(false)
            },
            () => setReload(false)
        )
    }

    return (
        <UpModal
            close={props.close}
            closeModal={props.closeModal}
            isEnableOuterClose={props.isEnableOuterClose}
            pd={props.pd}
            bgColor='bg-white'
            w='w-[36rem]'
        >
            <div className="w-full">
                <div className="mb-6 border-b pb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Request Details
                    </h2>
                    <p className="text-[0.85em] text-gray-500 mt-1">
                        Review the submitted parent registration request.
                    </p>
                </div>

                {data != null ? (
                    <Body data={data} />
                ) : (
                    reload && (
                        <ViewModalSkeleton variant="record" />
                    )
                )}
            </div>
        </UpModal>
    )
}

const Body = ({ data }) => {
    const details = useMemo(() => {
        try {
            return typeof data.parent_details === "string"
                ? JSON.parse(data.parent_details)
                : data.parent_details || {}
        } catch {
            return {}
        }
    }, [data])

    const children = details.children || []

    return (
        <div className="grid gap-6">
            <div className="grid gap-4">
                <div className="grid grid-cols-3 items-start gap-3">
                    <span className="text-sm font-medium text-gray-500">
                        Parent Name
                    </span>
                    <span className="col-span-2 text-gray-800 font-medium">
                        {data.name || "-"}
                    </span>
                </div>

                <div className="grid grid-cols-3 items-start gap-3">
                    <span className="text-sm font-medium text-gray-500">
                        Role
                    </span>
                    <span className="col-span-2 text-gray-800 font-medium">
                        {details.parent_role ? toTitleCase(details.parent_role) : "-"}
                    </span>
                </div>

                <div className="grid grid-cols-3 items-start gap-3">
                    <span className="text-sm font-medium text-gray-500">
                        Parent Email
                    </span>
                    <span className="col-span-2 text-gray-800 font-medium break-all">
                        {data.email || "-"}
                    </span>
                </div>

                <div className="grid grid-cols-3 items-start gap-3">
                    <span className="text-sm font-medium text-gray-500">
                        Contact Number
                    </span>
                    <span className="col-span-2 text-gray-800 font-medium">
                        {details.contact_number || data.contact_number || "-"}
                    </span>
                </div>

                {details.sex && (
                    <div className="grid grid-cols-3 items-start gap-3">
                        <span className="text-sm font-medium text-gray-500">
                            Sex
                        </span>
                        <span className="col-span-2 text-gray-800 font-medium">
                            {details.sex === "m" ? "Male" : details.sex === "f" ? "Female" : details.sex}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid gap-2">
                <span className="text-sm font-medium text-gray-500">
                    Reason
                </span>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[0.85em] text-gray-800 whitespace-pre-line leading-relaxed">
                    {details.reason || data.reason || "-"}
                </div>
            </div>

            <div className="grid gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                        Children
                    </span>
                    <span className="text-[0.75em] px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {children.length} {children.length === 1 ? "Child" : "Children"}
                    </span>
                </div>

                {children.length > 0 ? (
                    <div className="grid gap-3 max-h-[18rem] overflow-y-auto pr-1">
                        {children.map((child, i) => (
                            <div
                                key={i}
                                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-[0.92em] font-semibold text-gray-800">
                                        Child #{i + 1}
                                    </h3>
                                    {child.program && (
                                        <span className="text-[0.72em] px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                            {child.program}
                                        </span>
                                    )}
                                </div>

                                <div className="grid gap-2 text-[0.83em]">
                                    <InfoRow
                                        label="Student ID"
                                        value={child.student_id}
                                    />
                                    <InfoRow
                                        label="Full Name"
                                        value={[
                                            child.first_name,
                                            child.middle_name,
                                            child.last_name,
                                        ]
                                            .filter(Boolean)
                                            .join(" ") || "-"}
                                    />
                                    <InfoRow
                                        label="Sex"
                                        value={
                                            child.sex === "m"
                                                ? "Male"
                                                : child.sex === "f"
                                                ? "Female"
                                                : "-"
                                        }
                                    />
                                    <InfoRow
                                        label="Program"
                                        value={child.program || "-"}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-[0.85em] text-gray-500">
                        No children submitted.
                    </div>
                )}
            </div>
        </div>
    )
}

const InfoRow = ({ label, value }) => {
    return (
        <div className="grid grid-cols-3 gap-3">
            <span className="text-gray-500 font-medium">{label}</span>
            <span className="col-span-2 text-gray-800">{value || "-"}</span>
        </div>
    )
}

export default ViewParentRequestModal