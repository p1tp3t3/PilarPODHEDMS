import bg from "@/images/bg-pilar.jpg"
import ProfilePic from "@/Components/other/profile-pic"
import { router, usePage } from "@inertiajs/react"
import { ReloadProvider } from "@/context-provider/reload-provider"
import { LogOut, MailCheck, UserRound, KeyRound, Check, ShieldCheck } from "lucide-react"
import { cloneElement, useState } from "react"
import { toTitleCase } from "@/others/function"

const STEPS = [
    { key: 'verify', title: 'Verify Email', desc: 'Confirm the email address on your account.', icon: MailCheck },
    { key: 'profile', title: 'Complete Profile', desc: 'Fill in your personal information.', icon: UserRound },
    { key: 'password', title: 'Set Password', desc: 'Replace the default password with your own.', icon: KeyRound },
]

// done → green check, current → blue ring, upcoming → gray
const StepDot = ({ state, icon: Icon, size = 'md' }) => {
    const box = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
    const cls = state === 'done'
        ? 'bg-green-600 text-white'
        : state === 'current'
            ? 'bg-[#00379c] text-white ring-4 ring-[#00379c]/15'
            : 'bg-gray-100 text-gray-400 border border-gray-200'
    return (
        <span className={`${box} ${cls} shrink-0 rounded-full grid place-items-center transition-colors`}>
            {state === 'done' ? <Check size={size === 'sm' ? 15 : 18} strokeWidth={3} /> : <Icon size={size === 'sm' ? 15 : 18} />}
        </span>
    )
}

// Title block at the top of each step's card.
export const StepHeading = ({ icon: Icon, title, desc }) => (
    <div className="flex items-start gap-3 pb-5 border-b border-gray-100">
        <span className="w-11 h-11 shrink-0 rounded-lg bg-[#00379c]/10 text-[#00379c] grid place-items-center">
            <Icon size={20} />
        </span>
        <div className="min-w-0">
            <h1 className="text-[1.15em] sm:text-[1.25em] font-bold text-gray-900">{title}</h1>
            {desc && <p className="text-[0.85em] text-gray-500 mt-0.5">{desc}</p>}
        </div>
    </div>
)

const SetupLayout = ({ children }) => {
    // Profile and password are only actually saved together, at the very
    // end (AccountSetupController::complete) — the profile→password
    // transition is a local view change within the same page
    // (edit-profile-form.jsx), not a navigation, so the step can't be
    // inferred from the URL past the very first load. This layout owns the
    // step as state and hands the setter down to the page it wraps, so both
    // the indicator here and the page's own conditional render stay in sync
    // off one source of truth.
    const [setupStep, setSetupStep] = useState(
        window.location.pathname.startsWith('/verify-email') ? 'verify' : 'profile'
    )
    const current = STEPS.findIndex((s) => s.key === setupStep)
    const stateOf = (i) => (i < current ? 'done' : i === current ? 'current' : 'upcoming')

    const firstName = usePage().props.auth?.user?.profile?.first_name
    const greeting = firstName ? `Welcome, ${toTitleCase(firstName)}!` : 'Welcome!'


    return (
        <ReloadProvider>
        <div className="w-full min-h-screen bg-gray-100">
            <header
                className="w-full relative bg-no-repeat bg-center bg-cover"
                style={{ backgroundImage: `url(${bg})` }}
            >
                <div className="bg-gradient-to-r from-[#00277a]/95 to-black/75 absolute w-full h-full left-0 top-0"></div>
                <div className="relative z-10 w-full max-w-6xl mx-auto px-4 pt-3 pb-8 sm:pb-10 text-white">
                    <div className="flex justify-between items-center gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <ProfilePic src={"/default-pic/pilar.png"} size={2.5} />
                            <div className="min-w-0">
                                <h1 className="text-[1em] font-bold">PilarPODHEDMS</h1>
                                <h1 className="text-[0.7em] truncate">Pilar College of Zamboanga City, Inc.</h1>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.visit('/log-out')}
                            className="shrink-0 inline-flex items-center gap-1.5 text-[0.85em] px-3 py-1.5 rounded-full border border-white/40 hover:bg-white/10"
                        >
                            <LogOut size={14} /> <span className="hidden sm:inline">Log Out</span>
                        </button>
                    </div>
                    <div className="mt-6 sm:mt-8">
                        <p className="text-[0.8em] uppercase tracking-wider text-white/70 font-semibold">Account setup</p>
                        <h2 className="text-[1.4em] sm:text-[1.7em] font-bold leading-tight mt-1">{greeting}</h2>
                        <p className="text-[0.9em] text-white/80 mt-1 max-w-[36rem]">
                            Your account was created with default details. Finish these three steps to start using the system.
                        </p>
                    </div>
                </div>
            </header>

            <div className="w-full max-w-6xl mx-auto px-4 -mt-4 sm:-mt-5 pb-10 relative z-10 grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
                {/* Phone / tablet: a compact stepper above the form */}
                <div className="lg:hidden bg-white rounded-xl shadow-sm shadow-black/10 px-4 py-4">
                    <ol className="flex items-start">
                        {STEPS.map((s, i) => (
                            <li key={s.key} className="flex-1 flex flex-col items-center text-center relative">
                                {i > 0 && (
                                    <span className={`absolute top-4 h-0.5 -translate-y-1/2 rounded ${i <= current ? 'bg-green-600' : 'bg-gray-200'}`} style={{ left: 'calc(-50% + 1.25rem)', right: 'calc(50% + 1.25rem)' }} />
                                )}
                                <StepDot state={stateOf(i)} icon={s.icon} size="sm" />
                                <span className={`mt-1.5 text-[0.72em] font-semibold ${i === current ? 'text-[#00379c]' : 'text-gray-500'}`}>{s.title}</span>
                            </li>
                        ))}
                    </ol>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[0.82em] text-gray-600">
                            <b className="text-gray-800">Step {current + 1} of 3:</b> {STEPS[current].desc}
                        </p>
                    </div>
                </div>

                {/* Desktop: a sticky side panel */}
                <aside className="hidden lg:block sticky top-5 bg-white rounded-xl shadow-sm shadow-black/10 p-5">
                    <p className="text-[0.75em] uppercase tracking-wider text-gray-500 font-semibold mb-4">Step {current + 1} of 3</p>
                    <ol className="grid">
                        {STEPS.map((s, i) => (
                            <li key={s.key} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <StepDot state={stateOf(i)} icon={s.icon} />
                                    {i < STEPS.length - 1 && <span className={`w-0.5 flex-1 min-h-[1.75rem] my-1 rounded ${i < current ? 'bg-green-600' : 'bg-gray-200'}`} />}
                                </div>
                                <div className="pt-1.5 pb-4">
                                    <p className={`text-[0.92em] font-semibold ${i === current ? 'text-[#00379c]' : i < current ? 'text-gray-800' : 'text-gray-400'}`}>{s.title}</p>
                                    <p className={`text-[0.8em] mt-0.5 ${i <= current ? 'text-gray-500' : 'text-gray-400'}`}>{i < current ? 'Done' : s.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 flex gap-2 text-[0.8em] text-blue-900">
                        <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                        <span>Your answers are kept on this device as you type. Nothing is saved to your account until you finish the last step.</span>
                    </div>
                </aside>

                <main className="min-w-0">
                    {cloneElement(children, { setupStep, setSetupStep })}
                </main>
            </div>
        </div>
        </ReloadProvider>
    )
}
export default SetupLayout
