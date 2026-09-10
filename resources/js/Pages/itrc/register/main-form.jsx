import FormTextfield from "@/Components/input/form-input";
import RadioButton from "@/Components/input/radio";
import FormButton from "@/Components/button/button";
import { useState, useEffect } from "react";
import StudentFields from "./unique-fields/student-fields";
import FacultyFields from "./unique-fields/faculty-fields";
import AdministrativeFields from "./unique-fields/administrative-fields";
import StaffFields from "./unique-fields/staff-fields";
import ParentFields from "./unique-fields/parent-fields";
import DropdownField from "@/Components/input/dropdown";
import {
  change,
  checkUserExist,
  clearField,
  showOutputModal,
  showWarningModal,
  toTitleCase,
} from "@/others/function";
import { RegisterService } from "@/others/services/register-service";
import UploadFileBtn from "@/Components/button/upload-file-btn";
import Switch from "@/Components/button/switch-btn";
import CheckBoxButton from "@/Components/input/checkbox";
import { Validator } from "@/others/classes/validator";
import UploadGuidelines from "@/Components/other/upload-guidelines";
import TabSwitcher from "@/Components/other/tab-switcher";

const RegistrationForm = ({
  baseData,
  selectionVal,
  validationErr,
  reload,
  clearReload,
  handleFileChange,
  setValidationLabel,
  setCSVColumn,
  setValidationError,
  handleToggle,
  activate,
  setUserType,
  uploadingCSV,
}) => {
  const [commonPasswordList, setCommonPasswordList] = useState(null),
    [errors, setErrors] = useState(false),
    [activeTab, setActiveTab] = useState('manual');

  const newField = () => {
    switch (baseData.user_type) {
      case "student":
        return { program: "", year_level: "", school_year_id: "", semester: "", enrolled_at: "" };
      case "faculty":
        return { program: "" };
      case "program_head":
        return { program: "" };
      case "staff":
        return { work_type: "", other_work_type: "" };
      case "parent":
        return { parent_role: "", work_occupation: "" };
      default:
        return {};
    }
  };

  const [data, setData] = useState({ ...baseData, ...newField() });
  const [activateManual, setActivateManual] = useState(false),
    [existUsername, setExistUsername] = useState(false),
    [existUserId, setExistUserId] = useState(false),
    [existEmail, setExistEmail] = useState(false),
    [agreedGuidelines, setAgreedGuidelines] = useState(false);

  useEffect(() => {
    fetch("/storage/list/common-password.txt")
      .then((res) => res.text())
      .then((data) => {
        const lines = data.split(/\r?\n/).filter(Boolean);
        setCommonPasswordList(new Set(lines));
      })
      .catch((x) => console.log(x));
  }, []);

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      user_type: prev.user_type,
      ...newField(),
    }));

    setValidationLabel(
      `Are You Sure You Want To Upload The CSV File to Generate ${toTitleCase(
        data.user_type
      )} Accounts?`
    );
    setCSVColumn("");
    setValidationError((prev) => ({
      ...prev,
      file: "",
    }));

    setUserType(data.user_type);
    setAgreedGuidelines(false);
    setActiveTab('manual');
  }, [data.user_type]);

  const supportsBulkUpload = data.user_type && !["itrc", "prefect", "program_head", "faculty", "parent"].includes(data.user_type);

  const handleChange = (e) => change(e, setData);

  const roleMap = {
    student: 'student',
    itrc: 'super_admin',
    prefect: 'sub_admin',
    faculty: 'teaching_staff',
    program_head: 'teaching_staff',
    staff: 'non_teaching_staff',
    parent: 'parent',
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append("activate", activateManual ? 1 : 0);
    const d = Object.fromEntries(formData.entries());
    d.role = roleMap[data.user_type] ?? data.user_type;
    if (data.user_type === 'faculty') d.position = 'faculty';
    if (data.user_type === 'program_head') d.position = 'program_head';
    d.id_number = d.user_id;
    const validator = new Validator(d, data.user_type);
    const errors = validator.validateRegistrationForm(commonPasswordList);
    const isErrorFree = Object.values(errors).every((err) => err === "");

    setValidationError(errors);
    setErrors(!isErrorFree || existUsername || existUserId || existEmail);

    if (!isErrorFree || existUsername || existUserId || existEmail) return;

    showWarningModal(
      `Are You Sure You Want To Register This ${toTitleCase(
        data.user_type
      )} Account?`,
      `Register ${toTitleCase(data.user_type)} Account`,
      "Cancel",
      () => {
        reload(
          true,
          "text-wait",
          `${toTitleCase(data.user_type)} is Generating. Please Wait`
        );
        RegisterService.registerUser(d, success, error);
      }
    );
  };

  const success = () => {
    reload(true, "");
    clearField(setData);
    showOutputModal(
      `${toTitleCase(data.user_type)} Account Registered Successfully`,
      's',
      () => {
        reload(false);
      }
    )
  };

  const error = (e) => {
    const err = e.response.data.message;
    reload(true, "");
    showOutputModal(
      `Failed to Register ${toTitleCase(data.user_type)}. ${err}`,
      'e',
      () => {
        reload(false);
      }
    )
  };

  const generatePassword = (length) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*_+<>?";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setData((prev) => ({ ...prev, password: result }));
  };

  return (
    <div className="w-full grid gap-6 sm:gap-8">
      {/* === USER TYPE SELECTION === */}
      <DropdownField
        default={{ val: "", label: "Select User Role" }}
        list={selectionVal[1]}
        name="user_type"
        val={data.user_type}
        onChange={handleChange}
        error={validationErr.user_type}
      />

      {/* === TABS === */}
      <TabSwitcher
        tabs={[
          { key: 'manual', label: 'Manual Registration' },
          ...(supportsBulkUpload ? [{ key: 'bulk', label: 'Bulk Upload' }] : []),
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {/* === BULK UPLOAD TAB === */}
      {activeTab === 'bulk' && supportsBulkUpload && (
        <div className="grid gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Switch
              checked={activate}
              onChange={handleToggle}
              effect={["bg-red-600", "bg-green-600"]}
            />
            <div className={`${activate ? "text-green-500" : "text-red-500"}`}>
              <b>{activate ? "Activate" : "Deactivate"}</b>
            </div>
          </div>

          <UploadGuidelines type={data.user_type} program={selectionVal[2]} />

          <CheckBoxButton.CheckBox
            id="agreed-guidelines"
            name="agreed_guidelines"
            label="I have read and understood the guidelines above."
            checked={agreedGuidelines}
            change={(e) => setAgreedGuidelines(e.target.checked)}
          />

          {agreedGuidelines && (
            <UploadFileBtn
              name="csv-upload"
              accept=".csv"
              change={(e) => handleFileChange(e, data.user_type)}
              loading={uploadingCSV}
            >
              <i className="fa-solid fa-upload"></i> Upload{" "}
              {toTitleCase(data.user_type)} List CSV File
            </UploadFileBtn>
          )}

          {validationErr.file && (
            <div className="text-[#d12323] text-sm font-bold whitespace-pre-line">
              {validationErr.file}
            </div>
          )}
        </div>
      )}

      {/* === MANUAL REGISTRATION TAB === */}
      {activeTab === 'manual' && (
      <form onSubmit={handleSubmit} className="w-full grid gap-6 sm:gap-8">
      {/* === BASIC INFO === */}
      <div className="flex flex-col sm:flex-row gap-3">
        <FormTextfield
          label="First Name"
          name="first_name"
          val={data.first_name}
          change={handleChange}
          error={validationErr.first_name}
          errorAsterisk={validationErr.first_nameAsterisk}
        />
        <FormTextfield
          label="Middle Name"
          name="middle_name"
          val={data.middle_name}
          change={handleChange}
          error={validationErr.middle_name}
          errorAsterisk={validationErr.middle_nameAsterisk}
        />
        <FormTextfield
          label="Last Name"
          name="last_name"
          val={data.last_name}
          change={handleChange}
          error={validationErr.last_name}
          errorAsterisk={validationErr.last_nameAsterisk}
        />
        <FormTextfield
          label="Suffix (Optional)"
          name="suffix"
          val={data.suffix}
          change={handleChange}
          error={validationErr.suffix}
          errorAsterisk={validationErr.suffixAsterisk}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <FormTextfield
          label="User I.D"
          name="user_id"
          val={data.user_id}
          change={handleChange}
          checkExists={(v) => checkUserExist("id_number", v)}
          setExist={setExistUserId}
          errorEmpty="Please Fill Up the User I.D"
          error={validationErr.user_id}
          errorAsterisk={validationErr.user_idAsterisk}
        />
      </div>

      {/* === DYNAMIC USER-SPECIFIC FIELDS === */}
      <OtherField
        userType={data.user_type}
        data={data}
        handleChange={handleChange}
        selectionVal={[...selectionVal]}
        validationErr={validationErr}
      />

      {/* === CREDENTIALS === */}
      <div className="flex flex-col sm:flex-row gap-3">
        <FormTextfield
          label="Username"
          name="username"
          val={data.username}
          change={handleChange}
          checkExists={(v) => checkUserExist("username", v)}
          setExist={setExistUsername}
          error={validationErr.username}
          errorAsterisk={validationErr.usernameAsterisk}
        />
        <FormTextfield
          label="Email"
          name="email"
          val={data.email}
          checkExists={(v) => checkUserExist("email", v)}
          setExist={setExistEmail}
          change={handleChange}
          error={validationErr.email}
          errorAsterisk={validationErr.emailAsterisk}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <div className="w-full">
          <FormTextfield
            label="Password"
            name="password"
            id="password"
            type="password"
            val={data.password}
            change={handleChange}
            enableShowPassword={true}
            error={validationErr.password}
            errorAsterisk={validationErr.passwordAsterisk}
          />
        </div>
        <button
          type="button"
          onClick={() => generatePassword(15)}
          className="bg-gray-200 hover:bg-gray-300 rounded text-[0.8em] px-4 py-2 mt-1 sm:mt-0"
        >
          Generate Password
        </button>
      </div>
      

      {/* === TOGGLE & SUBMIT === */}
      <div className="grid gap-4 pb-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Switch
            checked={activateManual}
            onChange={(e) => setActivateManual(e.target.checked)}
            effect={["bg-red-600", "bg-green-600"]}
          />
          <div
            className={`${activateManual ? "text-green-500" : "text-red-500"}`}
          >
            <b>{activateManual ? "Activate" : "Deactivate"}</b>
          </div>
        </div>
        {validationErr.all_fields && (
          <div className="text-[#d12323] text-sm font-bold">
            Please Fill Up All The Fields*
          </div>
        )}
      </div>

      <FormButton
        type="submit"
        label={`Register ${toTitleCase(data.user_type)}`}
      />
      </form>
      )}
    </div>
  );
};

const OtherField = ({ userType, data, handleChange, selectionVal, validationErr }) => {
  switch (userType) {
    case "student":
      return (
        <StudentFields
          data={data}
          handleChange={handleChange}
          selectionVal={selectionVal}
          validationErr={validationErr}
        />
      );
    case "faculty":
      return (
        <FacultyFields
          data={data}
          handleChange={handleChange}
          selectionVal={selectionVal}
          validationErr={validationErr}
        />
      );
    case "program_head":
      return (
        <AdministrativeFields
          data={data}
          handleChange={handleChange}
          selectionVal={selectionVal}
          validationErr={validationErr}
        />
      );
    case "staff":
      return (
        <StaffFields
          data={data}
          handleChange={handleChange}
          validationErr={validationErr}
        />
      );
    case "parent":
      return (
        <ParentFields
          data={data}
          handleChange={handleChange}
          validationErr={validationErr}
        />
      );
  }
};

export default RegistrationForm;