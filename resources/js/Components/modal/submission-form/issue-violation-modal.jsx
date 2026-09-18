import UpModal from "../up-modal";
import FormTextfield from "@/Components/input/form-input";
import RichTextEditor from "@/Components/input/rich-text-editor";
import DropdownField from "../../input/dropdown";
import RadioButton from "@/Components/input/radio";
import FormButton from "../../button/button";
import ProfilePic from "@/Components/other/profile-pic";
import { useEffect, useState } from "react";
import { ViolationService } from "@/others/services/violation-service";
import { change, showWarningModal, getProfilePic, showUserType, showOutputModal } from "../../../others/function";

const IssueViolationModal = (props) => {
  const [subjects, setSubjects] = useState([]);
  const [validationErr, setValidationError] = useState({});

  useEffect(() => {
    if (props.complaint?.complaint_subject?.length > 0) {
      const list = props.complaint.complaint_subject.map((sub) => ({
        student_id: sub.user.id,
        case_number: props.complaint.case_number,
        violation: "",
        other_offense_description: "",
        other_offense_status: 1,
        violation_summary: "",
      }));
      setSubjects(list);
    } else {
      setSubjects([
        {
          student_id: props.complaint?.student_id || "",
          case_number: props.complaint?.case_number || "",
          violation: "",
          other_offense_description: "",
          other_offense_status: 1,
          violation_summary: "",
        },
      ]);
    }

    setValidationError({});
  }, [props.close]);

  const resetForm = () => {
    if (props.complaint?.complaint_subject?.length > 0) {
      const list = props.complaint.complaint_subject.map((sub) => ({
        student_id: sub.user.id,
        case_number: props.complaint.case_number,
        violation: "",
        other_offense_description: "",
        other_offense_status: 1,
        violation_summary: "",
      }));
      setSubjects(list);
    } else {
      setSubjects([
        {
          student_id: props.complaint?.student_id || "",
          case_number: props.complaint?.case_number || "",
          violation: "",
          other_offense_description: "",
          other_offense_status: 1,
          violation_summary: "",
        },
      ]);
    }

    setValidationError({});
  };

  const handleChange = (i, e) => {
    const { name, value } = e.target;
    setSubjects((prev) =>
      prev.map((item, index) =>
        index === i ? { ...item, [name]: value } : item
      )
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const emptySummary = subjects.some((s) => !s.violation_summary);
    if (emptySummary) {
      setValidationError({
        remark: "Summary is required for all entries.",
        remarkAsterisk: true,
      });
      return;
    }

    showWarningModal(
      `Are you sure you want to resolve Case No. ${props.complaint.case_number}?`,
      "Resolve Complaint",
      "Cancel",
      () => {
        const f = new FormData();
        f.append("id", props.complaint.id);
        f.append("subjects", JSON.stringify(subjects));

        props.reload(true, "text-wait", "Resolving Complaint is Processing");
        ViolationService.resolveComplaintToViolation(
          f,
          () => {
            props.reload(true, '')
            showOutputModal(
              "Complaint Resolved Successfully",
              "s",
              () => {
                props.reload(false)
                props.closeModal(false);
              }
            )
            resetForm(); // 🔥 Clear fields after submit
            props.success();
          },
          () => {
            props.reload(true, '')
            showOutputModal(
              "Failed to Resolve Complaint. Please Try Again",
              "e",
              () => {
                props.reload(false)
              }
            )
          }
        );
      }
    );
  };

  return (
    <UpModal
      close={props.close}
      closeModal={props.closeModal}
      isEnableOuterClose={props.isEnableOuterClose}
      pd={props.pd}
      bgColor="bg-white"
      w="w-[38rem]"
    >
      <div className="w-full">
        <h1 className="text-[1.2em] font-bold">
          Close Complaint Case No. {props.complaint?.case_number}
        </h1>

        <div className="py-3 w-full">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="grid gap-5 w-full">
              {subjects.map((sub, i) => {
                const subject = props.complaint?.complaint_subject?.[i]?.user;
                return (
                  <div key={i} className="border-b border-gray-200 py-3 grid gap-3">
                    <div className="flex gap-3 items-start">
                      {subject && (
                        <>
                          <ProfilePic
                            size={2}
                            src={getProfilePic(subject.profile_picture, subject.sex)}
                          />
                          <div>
                            <div className="text-[0.9em] font-semibold">
                              {`${subject.first_name} ${subject.middle_name ?? ""} ${subject.last_name}`}
                            </div>
                            <div className="text-[0.8em] text-gray-600">
                              {showUserType(subject)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <DropdownField.Search
                      default={{ val: "", label: "Select Offense" }}
                      name="violation"
                      val={sub.violation}
                      list={[
                        { val: "none", label: "No Offense Committed" },
                        ...props.violation_list,
                      ]}
                      onChange={(e) => handleChange(i, e)}
                    />

                    {sub.violation === "others" && (
                      <div className="grid gap-3">
                        <FormTextfield
                          label="Other Offense Description"
                          name="other_offense_description"
                          val={sub.other_offense_description}
                          change={(e) => handleChange(i, e)}
                        />
                        <RadioButton
                          label="Status"
                          list={[
                            { val: 1, label: "Major" },
                            { val: 0, label: "Minor" },
                          ]}
                          name="other_offense_status"
                          val={sub.other_offense_status}
                          change={(e) => handleChange(i, e)}
                        />
                      </div>
                    )}

                    <RichTextEditor
                      label="Summary About the Incident"
                      val={sub.violation_summary}
                      change={(html) => handleChange(i, { target: { name: "violation_summary", value: html } })}
                      error={validationErr.remark}
                      minHeight="10rem"
                    />
                  </div>
                );
              })}

              <div className="grid justify-end pt-3">
                <FormButton type="submit" label="Submit" />
              </div>
            </div>
          </form>
        </div>
      </div>
    </UpModal>
  );
};

export default IssueViolationModal;
