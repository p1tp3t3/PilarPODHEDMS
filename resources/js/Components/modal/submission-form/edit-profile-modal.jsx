import ProfilePic from "../../other/profile-pic";
import UpModal from "../up-modal";
import FormTextfield from "@/Components/input/form-input";
import FormButton from "../../button/button";
import { useState } from "react";
import {
  sendData,
  fileChange,
  toTitleCase,
  check,
  checkUserExist,
  inArr,
  canEdit,
} from "../../../others/function";
import RadioButton from "@/Components/input/radio";
import ProfilePicEdit from "@/Components/input/profile-pic-edit-input";
import About from "@/Pages/other/profile/about";
import { Validator } from "@/others/classes/validator";
import { requestType } from "@/others/list/type-list";
import CheckBoxButton from "@/Components/input/checkbox";

const EditProfileModal = (props) => {
  return (
    <UpModal
      close={props.close}
      pd={["px-5", "py-4"]}
      isEnableOuterClose={props.close}
      closeModal={props.closeModal}
      bgColor="bg-white"
      cntr={true}
      // ✅ Responsive width: full on small screens, capped on desktop
      w="w-full max-w-[50rem]"
    >
      <Body
        data={props.data}
        profilePic={props.profilePic}
        change={props.change}
        setData={props.setData}
        username={props.username}
        profileChange={props.profileChange}
        user={props.user}
        reload={props.reload}
        openAccessTokenModal={props.openAccessTokenModal}
        setUpdate={props.setUpdate}
        program={props.program}
        submitLabel={props.submitLabel}
      />
    </UpModal>
  );
};

const Body = (props) => {
  const [preview, setPreview] = useState(null),
    [submit, setSubmit] = useState(false),
    [errors, setErrors] = useState(false),
    [validationErr, setValidationError] = useState({}),
    [existUserId, setExistUserId] = useState(false);

  const handleFileChange = (event) => {
    fileChange(event, setPreview, props.profileChange, true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    let education_background = {};

    if (props.data.user_type == "student") {
      education_background = {
        sh_school_name: f.get("sh_school_name"),
        sh_school_address: f.get("sh_school_address"),
        sh_year_graduated: f.get("sh_year_graduated"),
        college_school_name: f.get("college_school_name"),
        college_school_address: f.get("college_school_address"),
        college_year_graduated: f.get("college_year_graduated"),
        college_program: f.get("college_program"),
        tr_college_school_name: f.get("tr_college_school_name"),
        tr_college_school_address: f.get("tr_college_school_address"),
        tr_college_program: f.get("tr_college_program"),
        date_last_attended: f.get("date_last_attended"),
        year_level: f.get("year_level"),
        student_id: props.data.user_id,
      };
    }

    const d =
      props.data.user_type == "student"
        ? {
            ...props.data,
            data: {
              ...education_background,
            },
          }
        : props.data;

    if (!preview) {
      const validator = new Validator(d, d.user_type);
      const errors = validator.validateUpdateProfileForm(props.user.user_type);
      const isErrorFree = Object.values(errors).every((err) => err === "");
      setValidationError(errors);

      if (props.user.user_type == "itrc") {
        if (!isErrorFree || existUserId) return;
      } else {
        if (!isErrorFree) return;
      }
      props.openAccessTokenModal(d);
    }
  };

  const itrcAccessField = (type) => {
    return (props.user.user_type == "itrc" && props.data.user_type == type) ||
           (props.user.user_type == "prefect" && props.data.user_type == type);
  };

  const showUserAccessibility = () => {
    switch (props.data.user_type) {
      case "student":
        return requestType.filter(
          (e) => e.val == "complaint" || e.val == "absent_form" || e.val == "gatepass"
        );
      case "teaching_staff":
        return requestType.filter(
          (e) => e.val == "complaint" || e.val == "gatepass"
        );
      case "administrative":
        return requestType.filter(
          (e) =>
            e.val == "complaint" || e.val == "referral" || e.val == "gatepass"
        );
      case "parent":
        return requestType.filter((e) => e.val == "complaint");
      case "staff":
        return requestType.filter(
          (e) => e.val == "complaint" || e.val == "gatepass"
        );
      default:
        return requestType;
    }
  };

  const handleCheck = (e) => check(e, props.setData, "bool");
  const checkEdit = () => {
    if(props.user.user_type == 'itrc')
      return (
        props.user.user_type == 'itrc' || 
        (canEdit('itrc', 'student') || 
        canEdit('itrc', 'prefect') ||
        canEdit('itrc', 'faculty') ||
        canEdit('itrc', 'administrative') ||
        canEdit('itrc', 'staff') ||
        canEdit('itrc', 'parent'))
      )
    if(props.user.user_type == 'prefect')
      return (canEdit('prefect', 'student') || props.user.user_type == 'prefect')

    return false
  }

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        method="post"
        className="w-full grid gap-6 sm:gap-8"
      >
        <h1 className="text-[1.2em] sm:text-[1.3em] text-center font-bold">
          Edit{" "}
          {props.user.id == props.data.user_id
            ? "Your"
            : `${toTitleCase(props.data.first_name)}'s`}{" "}
          Profile Information
        </h1>

        {/* Profile Pic */}
        <div className="grid place-items-center gap-3">
          <ProfilePicEdit
            preview={preview}
            setPreview={setPreview}
            profilePic={props.profilePic}
            handleFileChange={handleFileChange}
            profileChange={props.profileChange}
            enableCrop={true}
            error={validationErr.profile_picture}
          />
        </div>

        {props.data.user_type != 'itrc' && (
          // Hidden via CSS (not conditionally unmounted) while the picture
          // cropper is showing (preview truthy) — EducationBackgroundSection
          // below keeps its own local state for the school-info fields, so
          // unmounting this block while cropping (then remounting once the
          // crop is confirmed) was wiping out whatever the user had already
          // typed there, reverting it to the original, untouched data.
          <div className={`grid gap-6 ${preview ? 'hidden' : ''}`}>
            {/* ✅ Wrap input rows
            {(checkEdit()) &&
            <div className="flex flex-col sm:flex-row gap-4">
              <FormTextfield
                label="First Name"
                name="first_name"
                id="first_name"
                val={props.data.first_name}
                change={props.change}
                req={true}
                error={validationErr.first_name}
                errorAsterisk={validationErr.first_nameAsterisk}
              />
              <FormTextfield
                label="Middle Name"
                name="middle_name"
                id="middle_name"
                val={props.data.middle_name}
                change={props.change}
                req={true}
                error={validationErr.middle_name}
                errorAsterisk={validationErr.middle_nameAsterisk}
              />
              <FormTextfield
                label="Last Name"
                name="last_name"
                id="last_name"
                val={props.data.last_name}
                change={props.change}
                req={true}
                error={validationErr.last_name}
                errorAsterisk={validationErr.last_nameAsterisk}
              />
            </div>}*/}

            <FormTextfield
              label="Date Of Birth"
              name="date_of_birth"
              type="date"
              id="date_of_birth"
              val={props.data.date_of_birth}
              change={props.change}
              req={true}
              error={validationErr.date_of_birth}
              errorAsterisk={validationErr.date_of_birthAsterisk}
            />

            <RadioButton
              label={<b>Sex</b>}
              name="sex"
              id="sex"
              change={props.change}
              val={props.data.sex}
              list={[
                { value: "m", label: "Male" },
                { value: "f", label: "Female" },
              ]}
            />
            <RadioButton
              label={<b>Civil Status</b>}
              name="civil_status"
              id="civil_status"
              change={props.change}
              val={props.data.civil_status}
              list={[
                { value: "single", label: "Single" },
                { value: "married", label: "Married" },
                { value: "separated", label: "Separated" },
              ]}
            />

            {/* Religion + Citizenship */}
            <div className="flex flex-col sm:flex-row gap-4">
              <FormTextfield
                label="Religion"
                name="religion"
                id="religion"
                val={props.data.religion}
                change={props.change}
                req={true}
                error={validationErr.religion}
                errorAsterisk={validationErr.religionAsterisk}
              />
              <FormTextfield
                label="Citizenship"
                name="citizenship"
                id="citizenship"
                val={props.data.citizenship}
                change={props.change}
                req={true}
                error={validationErr.citizenship}
                errorAsterisk={validationErr.citizenshipAsterisk}
              />
            </div>

            <FormTextfield
              label="Place of Birth"
              name="place_of_birth"
              id="place_of_birth"
              val={props.data.place_of_birth}
              change={props.change}
              req={true}
              error={validationErr.place_of_birth}
              errorAsterisk={validationErr.place_of_birthAsterisk}
            />

            {/* Email + Contact */}
            <div className="flex flex-col sm:flex-row gap-4">
              <FormTextfield
                label="Contact Number"
                name="phone_number"
                id="phone_number"
                type="number"
                val={props.data.phone_number}
                change={props.change}
                error={validationErr.contact_number}
                errorAsterisk={validationErr.contact_numberAsterisk}
              />
            </div>

            <AddressSection
              change={props.change}
              data={props.data}
              setData={props.setData}
              validationErr={validationErr}
            />
            {((props.data.user_type == 'student') ||
                (itrcAccessField('student'))) &&
            <div>
                <About.EducationBackgroundSection
                    type='form'
                    list={props.data.educationBackground}
                    student_data={props.data} 
                    usr={props.user}
                    validationErr={validationErr}
                    program={props.program}
                />
            </div>}
          </div>
        )}

        {!preview && (
          <div className="flex justify-end">
            <FormButton label={props.submitLabel || "Save Changes"} type="submit" />
          </div>
        )}
      </form>
    </div>
  );
};

const AddressSection = (props) => {
  const handleCheck = (e) => {
    if (e.target.checked) {
      props.setData({
        ...props.data,
        permanent_place: props.data.current_place,
        permanent_city: props.data.current_city,
        permanent_province: props.data.current_province,
        permanent_zipcode: props.data.current_zipcode,
      });
    } else {
      props.setData({
        ...props.data,
        permanent_place: "",
        permanent_city: "",
        permanent_province: "",
        permanent_zipcode: "",
      });
    }
  };

  return (
    <div>
      <h1 className="text-[1.1rem] sm:text-[1.2rem] font-bold mb-2">
        Address
      </h1>

      {/* Current Address */}
      <div className="py-2 grid gap-3">
        <p className="text-[0.85em] font-semibold">Current Address</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <FormTextfield
            label="Place"
            name="current_place"
            id="place"
            change={props.change}
            req={true}
            val={props.data.current_place}
            error={props.validationErr.current_place}
            errorAsterisk={props.validationErr.current_placeAsterisk}
          />
          <FormTextfield
            label="City"
            name="current_city"
            id="city"
            change={props.change}
            req={true}
            val={props.data.current_city}
            error={props.validationErr.current_city}
            errorAsterisk={props.validationErr.current_cityAsterisk}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <FormTextfield
            label="Province"
            name="current_province"
            id="province"
            change={props.change}
            req={true}
            val={props.data.current_province}
            error={props.validationErr.current_province}
            errorAsterisk={props.validationErr.current_provinceAsterisk}
          />
          <FormTextfield
            label="Zipcode"
            name="current_zipcode"
            id="zipcode"
            change={props.change}
            req={true}
            val={props.data.current_zipcode}
            error={props.validationErr.current_zipcode}
            errorAsterisk={props.validationErr.current_zipcodeAsterisk}
          />
        </div>
      </div>

      {/* Permanent Address */}
      <div className="py-2 grid gap-3">
        <p className="text-[0.85em] font-semibold">Permanent Address</p>
        <div className="text-[0.8em] flex gap-2 items-center">
          <input
            type="checkbox"
            id="auto-fill"
            onClick={handleCheck}
            className="cursor-pointer"
          />
          <label htmlFor="auto-fill">Same as Current Address</label>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <FormTextfield
            label="Place"
            name="permanent_place"
            id="p_place"
            change={props.change}
            req={true}
            val={props.data.permanent_place}
            error={props.validationErr.permanent_place}
            errorAsterisk={props.validationErr.permanent_placeAsterisk}
          />
          <FormTextfield
            label="City"
            name="permanent_city"
            id="p_city"
            change={props.change}
            req={true}
            val={props.data.permanent_city}
            error={props.validationErr.permanent_city}
            errorAsterisk={props.validationErr.permanent_cityAsterisk}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <FormTextfield
            label="Province"
            name="permanent_province"
            id="p_province"
            change={props.change}
            req={true}
            val={props.data.permanent_province}
            error={props.validationErr.permanent_province}
            errorAsterisk={props.validationErr.permanent_provinceAsterisk}
          />
          <FormTextfield
            label="Zipcode"
            name="permanent_zipcode"
            id="p_zipcode"
            change={props.change}
            req={true}
            val={props.data.permanent_zipcode}
            error={props.validationErr.permanent_zipcode}
            errorAsterisk={props.validationErr.permanent_zipcodeAsterisk}
          />
        </div>
      </div>
    </div>
  );
};

EditProfileModal.Body = Body;
export default EditProfileModal;
