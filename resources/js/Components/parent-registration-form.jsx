import FormTextfield from "./input/form-input";
import RichTextEditor from "./input/rich-text-editor";
import { Link } from "@inertiajs/react";
import FormButton from "./button/button";
import DropdownField from "./input/dropdown";
import RadioButton from "./input/radio";
import { checkUserExist } from "@/others/function";

const ParentRegistrationForm = (props) => {
  const handleChildChange = (index, field, value) => {
  const updatedChildren = [...(props.data.children || [])];
  updatedChildren[index] = {
    ...updatedChildren[index],
    [field]: value,
  };

  props.setData((prev) => ({
    ...prev,
    children: updatedChildren,
  }));
};

  const addChildRow = () => {
    props.setData((prev) => ({
      ...prev,
      children: [
        ...(prev.children || []),
        {
          student_id: "",
          first_name: "",
          middle_name: "",
          last_name: "",
          program: "",
          sex: "m",
        },
      ],
    }));
  };

  const removeChildRow = (index) => {
    const updatedChildren = [...(props.data.children || [])];
    updatedChildren.splice(index, 1);

    props.setData((prev) => ({
      ...prev,
      children: updatedChildren,
    }));
  };

  return (
    <div className="w-full md:w-[35rem] grid items-center px-4 sm:px-6 md:px-0 md:flex-shrink-0 bg-white">
      <form
        className="w-full flex flex-col gap-5"
        onSubmit={props.submit}
        method="post"
      >
        <div className="flex flex-col">
          <div>
            <div className="py-4 px-6 flex flex-col gap-1 border-b border-gray-300">
              <p className="text-[0.9em] sm:text-[1.3em] md:text-[1.5em] text-center font-bold">
                <div>Parent Registration</div>
              </p>
            </div>
            <h1 className="text-[0.85em] text-center py-5 text-gray-700">
              Please Register Your Details Here
            </h1>
          </div>
          <div className="flex flex-col px-6 pb-5 gap-3">
            <div className="grid gap-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <FormTextfield
                  label="First Name"
                  name="first_name"
                  id="first_name"
                  val={props.data.first_name}
                  change={props.onchange}
                  error={props.validationErr.first_name}
                  errorAsterisk={props.validationErr.first_nameAsterisk}
                />
                <FormTextfield
                  label="Middle Name"
                  name="middle_name"
                  id="middle_name"
                  val={props.data.middle_name}
                  change={props.onchange}
                  error={props.validationErr.middle_name}
                  errorAsterisk={props.validationErr.middle_nameAsterisk}
                />
                <FormTextfield
                  label="Last Name"
                  name="last_name"
                  id="last_name"
                  val={props.data.last_name}
                  change={props.onchange}
                  error={props.validationErr.last_name}
                  errorAsterisk={props.validationErr.last_nameAsterisk}
                />
              </div>
              {/* Children Input List */}
              <div className="grid gap-3 z-10">
                <div className="flex items-center justify-between">
                  <h1 className="text-[0.95em] font-bold">Children Details</h1>
                  <button
                    type="button"
                    onClick={addChildRow}
                    className="px-3 py-1.5 text-[0.85em] rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Add Child
                  </button>
                </div>
                {(props.data.children || []).length !== 0 ? (
                  <div className="grid gap-4">
                    {(props.data.children || []).map((child, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 grid gap-3 bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <h2 className="text-[0.9em] font-semibold">
                            Child #{index + 1}
                          </h2>
                          <button
                            type="button"
                            onClick={() => removeChildRow(index)}
                            className="px-3 py-1 text-[0.8em] rounded-md bg-red-500 text-white hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>

                        <div className="grid gap-3">
                          <FormTextfield
                            label="Student ID"
                            name="student_id"
                            id={`student_id_${index}`}
                            val={child.student_id}
                            change={(e) => handleChildChange(index, 'student_id', e.target.value)}
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FormTextfield
                              label="First Name"
                              name="first_name"
                              id={`child_first_name_${index}`}
                              val={child.first_name}
                              change={(e) => handleChildChange(index, 'first_name', e.target.value)}
                            />
                            <FormTextfield
                              label="Middle Name"
                              name="middle_name"
                              id={`child_middle_name_${index}`}
                              val={child.middle_name}
                              change={(e) => handleChildChange(index, 'middle_name', e.target.value)}
                            />
                            <FormTextfield
                              label="Last Name"
                              name="last_name"
                              id={`child_last_name_${index}`}
                              val={child.last_name}
                              change={(e) => handleChildChange(index, 'last_name', e.target.value)}
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-5">
                            <RadioButton
                              name={`child_sex_${index}`}
                              label={<b>Sex</b>}
                              id={`sex_${index}`}
                              change={(e) => handleChildChange(index, "sex", e.target.value)}
                              val={child.sex}
                              list={[
                                { value: "m", label: "Male" },
                                { value: "f", label: "Female" },
                              ]}
                            />
                            <DropdownField
                              default={{ val: '', label: 'Select Program' }}
                              name='program'
                              label='Program'
                              id={`program_${index}`}
                              onChange={(e) => handleChildChange(index, 'program', e.target.value)}
                              val={child.program}
                              list={props.programs}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[0.85em] text-gray-500 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                    No child added yet.
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-5">
                <DropdownField
                  name={`parent_role`}
                  id={`parent_role`}
                  onChange={props.onchange}
                  val={props.data.parent_role}
                  error={props.validationErr.parent_role}
                  default={{ val: "", label: "Select Relationship" }}
                  list={[
                    { value: "mother", label: "Mother" },
                    { value: "father", label: "Father" },
                    { value: "guardian", label: "Guardian" },
                  ]}
                  titleCase
                />
                {props.data.parent_role == "guardian" && (
                  <div className="w-full relative">
                    <RadioButton
                      label={<b>Sex</b>}
                      name="sex"
                      id="sex"
                      change={props.onchange}
                      val={props.data.sex}
                      list={[
                        { value: "m", label: "Male" },
                        { value: "f", label: "Female" },
                      ]}
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <FormTextfield
                  label="Personal Email"
                  name="email"
                  id="email"
                  type="email"
                  val={props.data.email}
                  checkExists={(v) => checkUserExist("email", v)}
                  setExist={props.setExistEmail}
                  change={props.onchange}
                  error={props.validationErr.email}
                  errorAsterisk={props.validationErr.emailAsterisk}
                />
                <FormTextfield
                  label="Contact Number"
                  name="contact_number"
                  id="contact_number"
                  type="number"
                  val={props.data.contact_number}
                  change={props.onchange}
                  error={props.validationErr.contact_number}
                  errorAsterisk={props.validationErr.contact_numberAsterisk}
                />
              </div>
              <div>
                <FormTextfield
                  label="Family Code (If Any)"
                  name="family_code"
                  id="family_code"
                  val={props.data.family_code}
                  change={props.onchange}
                  error={props.validationErr.family_code}
                  errorAsterisk={props.validationErr.family_codeAsterisk}
                />
              </div>
              <div>
                <RichTextEditor
                  label="Reason to Register"
                  val={props.data.reason}
                  change={(html) => props.onchange({ target: { name: "reason", value: html } })}
                  error={props.validationErr.reason}
                  req={true}
                  minHeight="10rem"
                />
              </div>
              <div className="w-full grid gap-1">
                <FormButton label="Register" type="submit" />
                <div className="text-[13px] text-center hover:underline text-blue-700 z-10">
                  Already Registered? <Link href="/">Login</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ParentRegistrationForm;