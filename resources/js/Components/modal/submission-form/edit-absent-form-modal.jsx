import EditsLeft, { editsLeftSentence } from "@/Components/other/edits-left"
import { reloadListData } from "@/others/hooks/use-list-data"
import UpModal from "../up-modal";
import { showWarningModal, showOutputModal, toTitleCase } from "../../../others/function";
import RichTextEditor from "@/Components/input/rich-text-editor";
import FormButton from "../../button/button";
import CheckBoxButton from "@/Components/input/checkbox";
import PicVidUpload from "@/Components/input/pic-vid-upload";
import BetweenTextfield from "@/Components/input/between-input";
import { useEffect, useState } from "react";
import { AbsentFormService } from "@/others/services/absent-form-service";
import { Validator } from "@/others/classes/validator";
import RejectedNote from "@/Components/other/rejected-note";

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
    // A rejected absent form: editing resubmits it to the prefect (once).
    const resubmit = !!props.data?.rejected_at && !props.data?.confirmed_at
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
        const errors = Validator.absentForm({ ...data, reasons: checkedReasons, other_reason: otherReason }, "reason");
        setValidationError(errors);
        return !Validator.hasErrors(errors);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const f = new FormData();
        const reasons = [...checkedReasons];
        if (!Validator.isBlank(otherReason)) reasons.push(otherReason.trim());
        reasons.forEach((r, i) => f.append(`reason[${i}]`, r));
        f.append("date_from", data.date_from);
        f.append("date_to", data.date_to);
        f.append("hidden_evidence_files", JSON.stringify(existingEvidence.map((e) => e.file)));
        req_picture_list.forEach((file, i) => f.append(`evidence[${i}]`, file));

        showWarningModal(
            resubmit
                ? "Resubmit This Absent Form To The Prefect? You Can Only Resubmit It Once."
                : `Save Changes To This Absent Form? ${editsLeftSentence(props.data?.edits_left)}`,
            resubmit ? "Resubmit" : "Save Changes",
            "Cancel",
            () => {
                props.reload(true, "text-wait", resubmit ? "Resubmitting Your Absent Form" : "Saving Your Changes");
                AbsentFormService.update(props.data.id, f, success, error);
            }
        );
    };

    const success = () => {
        props.reload(true, "");
        showOutputModal(resubmit ? "Absent Form Resubmitted To The Prefect" : "Absent Form Updated Successfully", "s", () => {
            props.reload(false);
            props.closeModal(false);
            // Refresh the table(s) behind it to show the change.
            reloadListData()
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
                    <div className="flex flex-wrap items-center gap-2">
                        <h1><b>{resubmit ? "Edit & Resubmit Your Absent Form" : "Edit Your Absent Form"}</b></h1>
                        {/* How many edits remain (up to 3 while pending). */}
                        {!resubmit && <EditsLeft left={props.data?.edits_left} />}
                    </div>
                </div>
                {/* Rejected: why, so the changes can address it. */}
                {resubmit && (
                    <RejectedNote reason={props.data?.rejected_reason}
                        text="Make the changes needed (e.g. add proof), then resubmit it. The prefect will review it again. You can resubmit it once." />
                )}
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

                        <RichTextEditor
                            label="State Your Reason"
                            change={setOtherReason}
                            val={otherReason}
                            minHeight="10rem"
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
                                    src: `/absent-form/${props.data?.encrypted_id}/evidence/${e.file}`,
                                    href: `/absent-form/${props.data?.encrypted_id}/evidence/${e.file}`,
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
                            <FormButton type="submit" label={resubmit ? "Resubmit" : "Save Changes"} />
                        </div>
                    </form>
                </div>
            </div>
        </UpModal>
    );
};

export default EditAbsentFormModal;
