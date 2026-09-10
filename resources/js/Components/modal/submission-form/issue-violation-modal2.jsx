import UpModal from "../up-modal";
import FormTextfield from "@/Components/input/form-input";
import DropdownField from "../../input/dropdown";
import RadioButton from "@/Components/input/radio";
import FormButton from "../../button/button";
import ProfilePic from "@/Components/other/profile-pic";
import { useEffect, useState } from "react";
import { ViolationService } from "@/others/services/violation-service";
import {
  showWarningModal,
  getProfilePic,
  showUserType,
  showOutputModal,
  toTitleCase
} from "../../../others/function";

const IssueViolationModal2 = (props) => {
  const [subjects, setSubjects] = useState([]);
  const [summary, setSummary] = useState("");
  const [validationErr, setValidationError] = useState({});

  // -------------------------------------------------------
  // Load initial subjects
  // -------------------------------------------------------
  useEffect(() => {
    let list = [];

    if (props.complaint?.complaintSubject?.length > 0) {
      list = props.complaint.complaintSubject.map((sub) => ({
        student_id: sub.user.id,
        case_number: props.complaint.case_number,
        offenses: [
          {
            violation: "",
            other_offense_description: "",
            other_offense_status: 1,
          },
        ],
      }));
    } else {
      list = [
        {
          student_id: props.complaint?.student_id || "",
          case_number: props.complaint?.case_number || "",
          offenses: [
            {
              violation: "",
              other_offense_description: "",
              other_offense_status: 1,
            },
          ],
        },
      ];
    }

    setSubjects(list);
    setSummary("");
    setValidationError({});
  }, [props.close]);

  // -------------------------------------------------------
  // Offense change
  // -------------------------------------------------------
  const handleOffenseChange = (i, j, e) => {
    const { name, value } = e.target;

    setSubjects((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? {
              ...item,
              offenses: item.offenses.map((off, offIdx) =>
                offIdx === j ? { ...off, [name]: value } : off
              ),
            }
          : item
      )
    );
  };

  // Add offense
  const addOffense = (i) => {
    setSubjects((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? {
              ...item,
              offenses: [
                ...item.offenses,
                {
                  violation: "",
                  other_offense_description: "",
                  other_offense_status: 1,
                },
              ],
            }
          : item
      )
    );
  };

  // Remove offense
  const removeOffense = (i, j) => {
    setSubjects((prev) =>
      prev.map((item, idx) =>
        idx === i
          ? { ...item, offenses: item.offenses.filter((_, k) => k !== j) }
          : item
      )
    );
  };

  // -------------------------------------------------------
  // VALIDATION + SUBMIT
  // -------------------------------------------------------
  const handleSubmit = (e) => {
    e.preventDefault();

    let errors = {};
    let hasError = false;

    // (1) Summary required — one shared narrative for the whole complaint
    if (!summary.trim()) {
      hasError = true;
      errors.summary = "Summary of the incident is required.";
    }

    subjects.forEach((student, studentIndex) => {
      const offenses = student.offenses;

      // (2) Check if "none" is selected with other violations
      const noneSelected = offenses.some((o) => o.violation === "none");

      if (noneSelected && offenses.length > 1) {
        hasError = true;
        errors[`none_${studentIndex}`] =
          "'No Offense Committed' cannot be selected together with other offenses.";
      }

      // (3) Check duplicate offenses (exact same)
      const selectedList = offenses.map((o) => o.violation);
      const duplicates = selectedList.filter(
        (v, idx) => v !== "none" && selectedList.indexOf(v) !== idx
      );

      if (duplicates.length > 0) {
        hasError = true;
        errors[`duplicate_${studentIndex}`] =
          "Duplicate violations detected. Each offense must be unique.";
      }

      // (4) Validate each offense
      offenses.forEach((off, offenseIndex) => {
        if (!off.violation) {
          hasError = true;
          errors[`offense_${studentIndex}_${offenseIndex}`] =
            "Please select an offense.";
        }

        // (5) Validate others → must have description
        if (off.violation === "others" && !off.other_offense_description.trim()) {
          hasError = true;
          errors[`other_${studentIndex}_${offenseIndex}`] =
            "Other offense description is required.";
        }
      });
    });

    // Apply validation errors
    setValidationError(errors);
    if (hasError) return;

    // -------------------------------------------------------
    // Confirm + Submit
    // -------------------------------------------------------
    showWarningModal(
      `Are you sure you want to resolve Case No. ${props.complaint.case_number}?`,
      "Resolve Complaint",
      "Cancel",
      () => {
        const f = new FormData();
        f.append("id", props.complaint.id);
        f.append("incident_summary", summary);
        f.append("subjects", JSON.stringify(subjects));

        props.reload(true, "text-wait", "Resolving Complaint is Processing");
        ViolationService.resolveComplaintToViolation(
          f,
          () => {
            props.reload(true, "");
            showOutputModal("Complaint Resolved Successfully", "s", () => {
              props.reload(false);
              props.closeModal(false);
            });
          },
          () => {
            props.reload(true, "");
            showOutputModal("Failed to Resolve Complaint", "e", () => {
              props.reload(false);
            });
          }
        );
      }
    );
  };

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
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

        <form onSubmit={handleSubmit} className="py-3 w-full">
          <div className="grid gap-5 w-full">
            {subjects.map((sub, i) => {
              const subject = props.complaint?.complaintSubject?.[i]?.user;

              return (
                <div key={i} className="border-b border-gray-200 pb-5">
                  {/* Student Header */}
                  <div className="flex gap-3 items-start mb-3">
                    {subject && (
                      <>
                        <ProfilePic
                          size={2}
                          src={getProfilePic(
                            subject.profile?.profile_picture,
                            subject.profile?.sex
                          )}
                        />
                        <div>
                          <div className="text-[0.9em] font-semibold">
                            {`${subject.profile?.first_name} ${
                              subject.profile?.middle_name ?? ""
                            } ${subject.profile?.last_name}`}
                          </div>
                          <div className="text-[0.8em] text-gray-600">
                            {showUserType(subject)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* DUPLICATE ERROR */}
                  {validationErr[`duplicate_${i}`] && (
                    <p className="text-red-500 text-xs mb-2">
                      {validationErr[`duplicate_${i}`]}
                    </p>
                  )}

                  {/* NONE MIX ERROR */}
                  {validationErr[`none_${i}`] && (
                    <p className="text-red-500 text-xs mb-2">
                      {validationErr[`none_${i}`]}
                    </p>
                  )}

                  {/* OFFENSES */}
                  <h3 className="font-semibold mb-2 text-sm">Offenses</h3>

                  {sub.offenses.map((off, j) => (
                    <div key={j} className="border border-gray-200 p-3 mb-3">
                      <DropdownField.Search
                        default={{ val: "", label: "Select Offense" }}
                        name="violation"
                        val={off.violation}
                        list={[
                          { val: "none", label: "No Offense Committed" },
                          ...props.violation_list,
                        ]}
                        onChange={(e) => handleOffenseChange(i, j, e)}
                      />

                      {validationErr[`offense_${i}_${j}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {validationErr[`offense_${i}_${j}`]}
                        </p>
                      )}

                      {/* OTHERS */}
                      {off.violation === "others" && (
                        <>
                          <FormTextfield
                            label="Other Offense Description"
                            name="other_offense_description"
                            val={off.other_offense_description}
                            change={(e) => handleOffenseChange(i, j, e)}
                          />

                          {validationErr[`other_${i}_${j}`] && (
                            <p className="text-red-500 text-xs mt-1">
                              {validationErr[`other_${i}_${j}`]}
                            </p>
                          )}

                          <RadioButton
                            label="Status"
                            list={[
                              { val: 1, label: "Major" },
                              { val: 0, label: "Minor" },
                            ]}
                            name="other_offense_status"
                            val={off.other_offense_status}
                            change={(e) => handleOffenseChange(i, j, e)}
                          />
                        </>
                      )}

                      {sub.offenses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOffense(i, j)}
                          className="text-red-500 text-xs mt-2"
                        >
                          Remove Offense
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add offense */}
                  <button
                    type="button"
                    onClick={() => addOffense(i)}
                    className="text-blue-500 text-xs underline"
                  >
                    + Add another offense
                  </button>
                </div>
              );
            })}

            {/* Summary — one shared narrative for the whole complaint,
                not one per complainee */}
            <FormTextfield
              type="textarea"
              label="Summary About the Incident"
              name="summary"
              val={summary}
              change={(e) => setSummary(e.target.value)}
              error={validationErr.summary}
              errorAsterisk={!!validationErr.summary}
            />

            <div className="grid justify-end pt-3">
              <FormButton type="submit" label="Submit" />
            </div>
          </div>
        </form>
      </div>
    </UpModal>
  );
};

export default IssueViolationModal2;
