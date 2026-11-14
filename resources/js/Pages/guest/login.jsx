import LogInForm from "@/Components/log-in-form";
import { Head } from "@inertiajs/react";
import { useRoute } from "ziggy-js";
import "../style.css";
import { useState } from "react";
import axios from "axios";
import { showOutputModal } from "@/others/function";
import background from '@/images/bg-pilar2.jpg'
import { ReloadProvider } from "@/context-provider/reload-provider";

const LogIn = () => (
    <ReloadProvider>
        <LogInInner />
    </ReloadProvider>
);

// A failed login that isn't a wrong username/password (too many tries,
// server down, …): the output modal.
const loginErrorText = (err) =>
    err.response?.status === 429
        ? "Too many login attempts. Please wait a minute and try again."
        : err.response?.data?.message || "Something went wrong while logging in. Please try again.";

const LogInInner = () => {
    const route = useRoute();

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

        // The form disables itself and the button spins (LogInForm).
        setSubmitting(true);

        // On success the backend calls Inertia::location(intendedUrl). That
        // helper only replies with the interceptable 409 + X-Inertia-Location
        // form when the request is marked as coming from Inertia (the
        // X-Inertia header below) — otherwise it does a plain 302, which the
        // browser's XHR layer follows on its own before this code ever sees
        // it, so the visible page never actually changes. Sending the header
        // (without switching this page to Inertia's own router) gets the
        // 409 back, which the .catch() below turns into a real navigation —
        // landing on whatever route the user was trying to reach before
        // being sent to log in, or the dashboard if there wasn't one.
        localStorage.setItem("show-login-success", "1");
        localStorage.setItem("is-unresolved-complaint-modal-clicked", true);

        axios
            .post(route("log-in"), data, { headers: { "X-Inertia": true } })
            .catch((err) => {
                const redirect = err.response?.headers?.["x-inertia-location"];
                if (err.response?.status === 409 && redirect) {
                    // Shown here rather than on the destination page — it
                    // auto-dismisses after 5s (via the timer arg) so the
                    // redirect fires on its own if the user doesn't click
                    // through, immediate click-through still works too.
                    showOutputModal("Login Successfully", "s", () => {
                        window.location.href = redirect;
                    }, null, 5000);
                    return;
                }

                localStorage.removeItem("show-login-success");
                localStorage.removeItem("is-unresolved-complaint-modal-clicked");
                setSubmitting(false);

                const backend = err.response?.data || {};
                if (!backend.username && !backend.password) {
                    showOutputModal(loginErrorText(err), "e");
                    return;
                }
                setValidationError({
                    username: backend.username || "",
                    password: backend.password || "",
                });
            });
    };

    return (
        <>
            <Head title="Pilar College Prefect of Discipline of the Higher Education Department" />

            {/* Full-screen photo with the login card centered on top. */}
            <div className="w-full min-h-[100vh] relative flex flex-col items-center justify-center gap-5 px-4 py-8">
                <div className="fixed inset-0">
                    <img src={background} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-[#000000a6]"></div>
                </div>
                <LogInForm
                    submit={handleSubmit}
                    data={data}
                    onchange={handleChange}
                    validationErr={validationErr}
                    submitting={submitting}
                />
            </div>
        </>
    );
};

export default LogIn;
