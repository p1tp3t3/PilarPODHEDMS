import UpModal from "../up-modal";
import { change, showWarningModal, showOutputModal, toTitleCase } from "../../../others/function";
import FormTextfield from "@/Components/input/form-input";
import FormButton from "../../button/button";
import CheckBoxButton from "@/Components/input/checkbox";
import PicVidUpload from "@/Components/input/pic-vid-upload";
import BetweenTextfield from "@/Components/input/between-input";
import { useState } from "react";
import { AbsentFormService } from "@/others/services/absent-form-service";

const RequestAbsentFormModal = (props) => {
  return (
    <UpModal
      close={props.close}
      isEnableOuterClose={props.isEnableOuterClose}
      closeModal={props.closeModal}
      pd={props.pd}
      bgColor="bg-white"
      w="w-[90%] sm:w-[35rem]"
    >
      <div className="w-full">
        <div className="pt-3 text-[1.2em]">
          <h1 className="font-bold text-center sm:text-left">
            Send Reason of Absence
          </h1>
        </div>
        <Body id={props.id} reload={props.reload} />
      </div>
    </UpModal>
  );
};

const Body = ({ id, reload }) => {
  const [data, setData] = useState({
    student_id: id,
    date_from: "",
    date_to: "",
    absent_form_reason: [],
    other_reason: "",
    pic_evidence: [],
  });

  const [validationError, setValidationError] = useState({});
  const [picture_list, setPictureList] = useState([]);
  const [req_picture_list, setReqPictureList] = useState([]);

  // Handles text inputs & textarea
  const handleChange = (e) => {
    change(e, setData);
  };

  // Handles the reason checkboxes (multi-select)
  const handleReasonCheck = (value) => (e) => {
    setData((prev) => ({
      ...prev,
      absent_form_reason: e.target.checked
        ? [...prev.absent_form_reason, value]
        : prev.absent_form_reason.filter((r) => r !== value),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      showWarningModal(
        "Are You Sure You Want To Submit Your Absent Form To The Prefect?",
        "Submit Absent Form",
        "Cancel",
        () => {
          const f = new FormData();
          const reasons = [...data.absent_form_reason];

          if (data.other_reason.trim() !== "") {
            reasons.push(data.other_reason);
          }

          reasons.forEach((item, index) =>
            f.append(`reason[${index}]`, item)
          );

          f.append("student_id", data.student_id);
          f.append("date_from", data.date_from);
          f.append("date_to", data.date_to);

          req_picture_list.forEach((file, index) => {
            f.append(`evidence[${index}]`, file);
          });

          reload(true, "text-wait", "Your Absent Form is Processing");
          AbsentFormService.submit(f, success, error);
        }
      );
    }
  };

  const success = () => {
    reload(true, "");
    showOutputModal(
      '"Your Absent Form Sent Successfully to the Prefect',
      's',
      () => {
        setData((prev) => ({
      ...prev,
          date_from: "",
          date_to: "",
          absent_form_reason: [],
          other_reason: "",
        }));
        setPictureList([]);
        setReqPictureList([]);
        reload(false);
      }
    )
  };

  const error = (e) => {
    showOutputModal(
      toTitleCase(e.response.data.message),
      'e',
      () => {
        reload(false)
      }
    )
  };

  // ================================
  // VALIDATION LOGIC
  // ================================
  const validateForm = () => {
    let errors = {};

    // --- DATE VALIDATION ---
    if (!data.date_from) {
      errors.date_from = "Date From is required.";
    }

    if (!data.date_to) {
      errors.date_to = "Date To is required.";
    }

    // Check date order
    if (data.date_from && data.date_to) {
      const from = new Date(data.date_from);
      const to = new Date(data.date_to);

      if (to < from) {
        errors.date_to = "Date To must be later than or equal to Date From.";
      }
    }

    // --- REASON VALIDATION ---
    if (
      data.absent_form_reason.length === 0 &&
      data.other_reason.trim() === ""
    ) {
      errors.absent_form_reason = "Please select or type a reason.";
    }

    // --- EVIDENCE VALIDATION (required + type + size) ---
    if (req_picture_list.length === 0) {
      errors.pic_evidence = "Please upload at least one picture.";
    } else {
      const maxSizeMB = 2;
      const invalidFile = req_picture_list.find((file) => {
        const isImage = file.type.startsWith("image/");
        const sizeInMB = file.size / (1024 * 1024);
        return !isImage || sizeInMB > maxSizeMB;
      });

      if (invalidFile) {
        errors.pic_evidence = `Each file must be an image and not exceed ${maxSizeMB}MB.`;
      }
    }

    setValidationError(errors);

    return Object.keys(errors).length === 0;
  };

  const reasons = [
    { value: "Excused Absence", label: "Excused Absence" },
    { value: "Excused Tardiness", label: "Excused Tardiness" },
  ];

  return (
    <div className="py-3 w-full">
      <form onSubmit={handleSubmit} method="post" className="grid gap-5">
        {/* === DATE RANGE === */}
        <div>
          <label className="text-[0.9em] font-bold">Absent Date</label>
          <div className="mt-2">
            <BetweenTextfield
              type="date"
              labels={["Date From", "Date To"]}
              name={["date_from", "date_to"]}
              id={["date_from", "date_to"]}
              data={[data.date_from, data.date_to]}
              setData={setData}
            />
          </div>

          {validationError.date_from && (
            <div className="text-[#d12323] text-[12px] font-semibold mt-1">
              {validationError.date_from}
            </div>
          )}
          {validationError.date_to && (
            <div className="text-[#d12323] text-[12px] font-semibold">
              {validationError.date_to}
            </div>
          )}
        </div>

        {/* === REASON === */}
        <div>
          <label className="text-[0.9em] font-bold">Reason*</label>
          <div className="mt-2 grid gap-2">
            {reasons.map((r) => (
              <CheckBoxButton.CheckBox
                key={r.value}
                label={r.label}
                name="absent_form_reason"
                id={`absent_form_reason_${r.value}`}
                checked={data.absent_form_reason.includes(r.value)}
                change={handleReasonCheck(r.value)}
              />
            ))}
          </div>

          {validationError.absent_form_reason && (
            <div className="text-[#d12323] text-[12px] mt-1 font-semibold">
              {validationError.absent_form_reason}
            </div>
          )}
        </div>

        {/* === OTHER REASON === */}
        <div>
          <FormTextfield
            type="textarea"
            label="State Your Reason"
            name="other_reason"
            id="other_reason"
            error={validationError.absent_form_reason}
            change={handleChange}
            val={data.other_reason}
          />
        </div>

        {/* === FILE UPLOAD === */}
        <div className="grid gap-2">
          <label className="text-[0.9em] font-bold">
            Provide Supporting Picture(s)*
          </label>

          <PicVidUpload
            type="pic"
            label="Up To 5 Pictures"
            multiple={true}
            def="Upload Pictures Here Up To 2MB"
            fileList={picture_list}
            name="pic_evidence"
            id="pic_file"
            reqFileList={req_picture_list}
            setFileList={setPictureList}
            setReqFileList={setReqPictureList}
            maximumSize={2}
            maxCount={5}
          />

          {validationError.pic_evidence && (
            <div className="text-[#d12323] text-[12px] font-semibold">
              {validationError.pic_evidence}
            </div>
          )}
        </div>

        {/* === SUBMIT BUTTON === */}
        <div className="grid justify-end">
          <FormButton type="submit" label="Submit" />
        </div>
      </form>
    </div>
  );
};

RequestAbsentFormModal.Body = Body;
export default RequestAbsentFormModal;
