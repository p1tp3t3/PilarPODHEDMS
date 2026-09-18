import LogInForm from "@/Components/log-in-form";
import { Head } from "@inertiajs/react";
import { useRoute } from "ziggy-js";
import "./style.css";
import { useState } from "react";
import axios from "axios";
import { showOutputModal } from "@/others/function";
import background from '@/images/bg-pilar2.jpg'
import { ReloadProvider, useReload } from "@/context-provider/reload-provider";

const LogIn = () => (
    <ReloadProvider>
        <LogInInner />
    </ReloadProvider>
);

const LogInInner = () => {
    const route = useRoute();
    const { loadRegister } = useReload();

    const [data, setData] = useState({
        username: "",
        password: "",
    });

    const [validationErr, setValidationError] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const errors = {};

        if (!data.username) {
            errors.username = "Username is required"
            errors.usernameAsterisk = true
        }
        if (!data.password) {
            errors.password = "Password is required"
            errors.passwordAsterisk = true
        };

        setValidationError(errors);

        if (Object.keys(errors).length > 0) return;
        if (submitting) return; // avoid double submit

        setSubmitting(true);
        loadRegister(true, "logo");

        axios
            .post(route("log-in"), data)
            .then((res) => {

                // Show success modal FIRST. It auto-dismisses after 5s (via
                // the timer arg) so the redirect below fires on its own if
                // the user doesn't click through — clicking OK still works
                // as the immediate option.
                showOutputModal("Login Successfully", "s", () => {
                    localStorage.setItem("show-login-success", "1");
                    localStorage.setItem("is-unresolved-complaint-modal-clicked", true)
                    setData({
                        username: '',
                        password: ''
                    })
                    loadRegister(false)
                    window.location.reload();
                }, null, 5000);

            })
            .catch((err) => {
                loadRegister(false);
                setSubmitting(false);

                const backend = err.response.data;
                console.log(backend)
                setValidationError({
                    username: backend.username || "",
                    password: backend.password || "",
                });
            });
    };

    return (
        <>
            <Head title="Pilar College Prefect of Discipline of the Higher Education Department" />

            <div className="w-full h-[100vh]">
                <div className="flex w-full h-full">
                    <div className="hidden md:block w-full h-full relative">
                        <div className="absolute w-full h-full bg-[#000000a6]"></div>
                        <p className="text-white text-[3em] font-bold absolute frm px-10 mt-10">Hello Welcome! Praised Be Jesus And Mary</p>
                        <img src={background} alt="" className="h-full object-cover" />
                    </div>
                    <LogInForm
                        submit={handleSubmit}
                        data={data}
                        onchange={handleChange}
                        validationErr={validationErr}
                    />
                </div>
            </div>
        </>
    );
};

export default LogIn;
