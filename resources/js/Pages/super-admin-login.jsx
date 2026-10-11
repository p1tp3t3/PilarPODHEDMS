import LogInForm from "@/Components/log-in-form";
import { Head } from "@inertiajs/react";
import "./style.css";
import { useState } from "react";
import axios from "axios";
import { showOutputModal } from "@/others/function";
import background from '@/images/bg-pilar2.jpg'
import { ReloadProvider, useReload } from "@/context-provider/reload-provider";

const SuperAdminLogin = (props) => (
    <ReloadProvider>
        <SuperAdminLoginInner {...props} />
    </ReloadProvider>
);

const SuperAdminLoginInner = (props) => {
    const [data, setData] = useState({
        username: "",
        password: "",
    });

    const { loadRegister } = useReload();
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
        if (submitting) return;

        setSubmitting(true);
        loadRegister(true, "logo");

        axios
            .post(`/super-admin/login/${props.password}`, data)
            .then((res) => {
                showOutputModal("Login Successfully", "s", () => {
                    localStorage.setItem("show-login-success", "1");
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
                setValidationError({
                    username: backend.username || "",
                    password: backend.password || "",
                });
            });
    };

    return (
        <>
            <Head title="Super Admin Access - Maintenance" />

            {/* Full-screen photo with the login card centered on top. */}
            <div className="w-full min-h-[100vh] relative flex flex-col items-center justify-center gap-5 px-4 py-8">
                <div className="fixed inset-0">
                    <img src={background} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-[#000000a6]"></div>
                </div>
                <p className="relative hidden md:block text-white text-[2.2em] font-bold text-center max-w-4xl leading-tight">
                    System Under Maintenance — Super Admin Access Only
                </p>
                <LogInForm
                    submit={handleSubmit}
                    data={data}
                    onchange={handleChange}
                    validationErr={validationErr}
                />
            </div>
        </>
    );
};

export default SuperAdminLogin;
