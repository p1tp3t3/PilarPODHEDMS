import { useState } from "react";
import FormTextfield from "./input/form-input";
import header from "../images/pilar.png";
import { Link } from "@inertiajs/react";
import FormButton from "./button/button";
import CheckBoxButton from "./input/checkbox";
import { User, Lock } from "lucide-react";

const LogInForm = (props) => {


  return (
    <div className="frm relative w-full max-w-[26rem] flex flex-col items-center gap-3">
      {/* Logo sits on the background, just above the card. */}
      <img
        className="object-cover drop-shadow-lg"
        width={90}
        src={header}
        alt="Pilar College logo"
      />
      <form
        className="w-full flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
        onSubmit={props.submit}
        method="post"
      >
        {/* Card Container */}
        <div className="flex flex-col">
          <div>
            <div className="pt-5 pb-4 px-6 flex flex-col gap-1 border-b border-gray-300">
              <div className="text-[0.9em] sm:text-[1em] md:text-[1.1em] text-center font-bold">
                <div>Prefect of Discipline</div>
                <div>Management System</div>
              </div>
              <p className="text-[0.6em] sm:text-[0.7em] md:text-[0.8em] text-center">
                Higher Education Department
              </p>
            </div>
            <h1 className="text-[0.85em] text-center py-4 text-gray-700">
              Please Log In to Continue
            </h1>
          </div>

          {/* Form Inputs */}
          <div className="flex flex-col px-6 pb-5 gap-3">
            <div className="grid gap-6">
              {/* USERNAME FIELD */}
              <FormTextfield
                label="Username or User ID"
                name="username"
                id="username"
                val={props.data.username}
                change={props.onchange}
                error={props.validationErr.username}
                errorAsterisk={props.validationErr.usernameAsterisk}
                icon={User}
              />

              {/* PASSWORD FIELD */}
              <FormTextfield
                label="Password"
                type="password"
                name="password"
                id="password"
                val={props.data.password}
                change={props.onchange}
                icon={Lock}
                enableShowPassword={true}
                error={props.validationErr.password}
                errorAsterisk={props.validationErr.passwordAsterisk}
              />

              {/* Submit Button */}
              <div className="w-full grid gap-1">
                <FormButton label="Log in" type="submit" />

                <div className="text-[13px] text-center hover:underline text-blue-700 z-10">
                  <Link href="/forgot-password">Forgot Password?</Link>
                </div>

                <div className="text-[13px] text-center hover:underline text-blue-700 z-10">
                  <Link href="/parent-register">Register As Parent Here</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LogInForm;
