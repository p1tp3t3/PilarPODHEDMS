import UpModal from "../up-modal";
import { showWarningModal, showOutputModal, toTitleCase } from "../../../others/function";
import FormTextfield from "@/Components/input/form-input";
import FormButton from "../../button/button";
import CheckBoxButton from "@/Components/input/checkbox";
import PicVidUpload from "@/Components/input/pic-vid-upload";
import BetweenTextfield from "@/Components/input/between-input";
import { useEffect, useState } from "react";
import { AbsentFormService } from "@/others/services/absent-form-service";

const REASONS = [
    { value: "Excused Absence", label: "Excused Absence" },
    { value: "Excused Tardiness", label: "Excused Tardiness" },
];

const safeParseArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || value === "") return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const EditAbsentFormModal = (props) => {
    const [data, setData] = useState({ date_from: "", date_to: "" });
    const [checkedReasons, setCheckedReasons] = useState([]);
    const [otherReason, setOtherReason] = useState("");
    const [existingEvidence, setExistingEvidence] = useState([]);
    const [picture_list, setPictureList] = useState([]);
    const [req_picture_list, setReqPictureList] = useState([]);
    const [validationError, setValidationError] = useState({});

    useEffect(() => {
        if (props.close && props.data) {
            const reasons = safeParseArray(props.data.reason);
            const known = reasons.filter((r) => REASONS.some((opt) => opt.value === r));
            const unknown = reasons.filter((r) => !REASONS.some((opt) => opt.value === r));

            setData({ date_from: props.data.date_from ?? "", date_to: props.data.date_to ?? "" });
            setCheckedReasons(known);
            setOtherReason(unknown.join(", "));
            setExistingEvidence(safeParseArray(props.data.evidences));
            setPictureList([]);
            setReqPictureList([]);
            setValidationError({});
        }
    }, [props.close, props.data]);

    const handleReasonCheck = (value) => (e) => {
        setCheckedReasons((prev) =>
            e.target.checked ? [...prev, value] : prev.filter((r) => r !== value)
        );
    };

    const validateForm = () => {
        const errors = {};
        if (!data.date_from) errors.date_from = "Date From is required.";
        if (!data.date_to) errors.date_to = "Date To is required.";
        if (data.date_from && data.date_to && new Date(data.date_to) < new Date(data.date_from)) {
            errors.date_to = "Date To must be later than or equal to Date From.";
        }
        if (checkedReasons.length === 0 && otherReason.trim() === "") {
            errors.reason = "Please select or type a reason.";
        }
        setValidationError(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const f = new FormData();
        const reasons = [...checkedReasons];
        if (otherReason.trim() !== "") reasons.push(otherReason.trim());
        reasons.forEach((r, i) => f.append(`reason[${i}]`, r));
        f.append("date_from", data.date_from);
        f.append("date_to", data.date_to);
        f.append("hidden_evidence_files", JSON.stringify(existingEvidence.map((e) => e.file)));
        req_picture_list.forEach((file, i) => f.append(`evidence[${i}]`, file));

        showWarningModal(
            "Save Changes To This Absent Form? You Will Not Be Able To Edit It Again.",
            "Save Changes",
            "Cancel",
            () => {
                props.reload(true, "text-wait", "Saving Your Changes");
                AbsentFormService.update(props.data.id, f, success, error);
            }
        );
    };

    const success = () => {
        props.reload(true, "");
        showOutputModal("Absent Form Updated Successfully", "s", () => {
            props.reload(false);
            props.closeModal(false);
        });
    };
    const error = (e) => {
        props.reload(true, "");
        showOutputModal(toTitleCase(e?.response?.data?.message) || "There was an Error. Please Try Again", "e", () => {
            props.reload(false);
        });
    };

    return (
        <UpModal
            close={props.close}
            isEnableOuterClose={props.isEnableOuterClose}
            closeModal={props.closeModal}
            pd={props.pd ?? ["px-10", "py-4"]}
            bgColor="bg-white"
            w="w-[90%] sm:w-[35rem]"
        >
            <div className="w-full">
                <div className="pt-2 text-[1.1em] sm:text-[1.2em]">
                    <h1><b>Edit Your Absent Form</b></h1>
                    <p className="text-[0.75em] text-gray-500 mt-1">
                        You can only edit this absent form once. Evidence you've already uploaded will be kept — new files are added on top of it.
                    </p>
                </div>
                <div className="py-3 w-full">
                    <form onSubmit={handleSubmit} className="grid gap-5">
                        <div>
                            <label className="text-[0.9em] font-bold">Absent Date</label>
                            <div className="mt-2">
                                <BetweenTextfield
                                    type="date"
                                    labels={["Date From", "Date To"]}
                                    name={["date_from", "date_to"]}
                                    id={["edit_date_from", "edit_date_to"]}
                                    data={[data.date_from, data.date_to]}
                                    setData={setData}
                                />
                            </div>
                            {validationError.date_from && (
                                <div className="text-[#d12323] text-[12px] font-semibold mt-1">{validationError.date_from}</div>
                            )}
                            {validationError.date_to && (
                                <div className="text-[#d12323] text-[12px] font-semibold">{validationError.date_to}</div>
                            )}
                        </div>

                        <div>
                            <label className="text-[0.9em] font-bold">Reason*</label>
                            <div className="mt-2 grid gap-2">
                                {REASONS.map((r) => (
                                    <CheckBoxButton.CheckBox
                                        key={r.value}
                                        label={r.label}
                                        name="edit_absent_form_reason"
                                        id={`edit_absent_form_reason_${r.value}`}
                                        checked={checkedReasons.includes(r.value)}
                                        change={handleReasonCheck(r.value)}
                                    />
                                ))}
                            </div>
                            {validationError.reason && (
                                <div className="text-[#d12323] text-[12px] mt-1 font-semibold">{validationError.reason}</div>
                            )}
                        </div>

                        <FormTextfield
                            type="textarea"
                            label="State Your Reason"
                            name="other_reason"
                            id="edit_other_reason"
                            change={(e) => setOtherReason(e.target.value)}
                            val={otherReason}
                        />

                        <div className="grid gap-2">
                            <label className="text-[0.9em] font-bold">Evidence</label>
                            <PicVidUpload
                                type="pic"
                                label="Up To 5 Pictures"
                                multiple={true}
                                def="Upload Pictures Here Up To 2MB"
                                fileList={picture_list}
                                existingList={existingEvidence.map((e) => ({
                                    key: e.file,
                                    src: `/absent-form/${props.data?.id}/evidence/${e.file}`,
                                    href: `/absent-form/${props.data?.id}/evidence/${e.file}`,
                                }))}
                                onRemoveExisting={(file) =>
                                    setExistingEvidence((prev) => prev.filter((e) => e.file !== file))
                                }
                                name="pic_evidence"
                                id="edit_pic_file"
                                reqFileList={req_picture_list}
                                setFileList={setPictureList}
                                setReqFileList={setReqPictureList}
                                maximumSize={2}
                                maxCount={5}
                            />
                        </div>

                        <div className="grid justify-end">
                            <FormButton type="submit" label="Save Changes" />
                        </div>
                    </form>
                </div>
            </div>
        </UpModal>
    );
};

export default EditAbsentFormModal;
