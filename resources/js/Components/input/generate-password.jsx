import { useState } from "react";
import { Wand2, Copy, Check } from "lucide-react";
import { generateStrongPassword } from "@/others/function";

// "Generate Password" button used wherever a password is set (account
// settings, registering a new user). It makes a password that meets the
// password rules, hands it to onGenerate (which fills the form's fields),
// and shows it with a Copy button, since password fields hide what's in them.
// The box hides again once `value` (the field) no longer holds it, e.g. the
// user typed their own.
const GeneratePassword = ({ onGenerate, value, length = 16, note = "Save it somewhere safe before you continue. It won't be shown again." }) => {
    const [generated, setGenerated] = useState("");
    const [copied, setCopied] = useState(false);

    const generate = () => {
        const password = generateStrongPassword(length);
        onGenerate(password);
        setGenerated(password);
        setCopied(false);
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(generated);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    const shown = generated && (value === undefined || value === generated);

    return (
        <div className="grid gap-2">
            <div>
                <button
                    type="button"
                    onClick={generate}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[0.8em] font-semibold px-3 py-1.5"
                >
                    <Wand2 size={14} /> Generate Password
                </button>
            </div>
            {shown && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[0.8em]">
                    <span className="text-blue-900">New password:</span>
                    <code className="font-mono font-semibold text-gray-900 break-all">{generated}</code>
                    <button
                        type="button"
                        onClick={copy}
                        className="ml-auto inline-flex items-center gap-1 rounded bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 px-2 py-0.5"
                    >
                        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                    {note && <p className="w-full text-[0.95em] text-blue-900/80">{note}</p>}
                </div>
            )}
        </div>
    );
};

export default GeneratePassword;
