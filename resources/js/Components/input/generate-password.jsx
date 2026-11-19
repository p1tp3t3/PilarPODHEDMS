import { useState } from "react";
import { Wand2, Copy, Check } from "lucide-react";
import { generateStrongPassword } from "@/others/function";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";

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
        <Box sx={{ display: "grid", gap: 1 }}>
            <Box>
                <Button
                    type="button"
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<Wand2 size={14} />}
                    onClick={generate}
                    sx={{ textTransform: "none", fontWeight: 600, fontSize: 12.5, borderRadius: 2, borderColor: "divider", color: "text.secondary" }}
                >
                    Generate Password
                </Button>
            </Box>
            {shown && (
                <Alert
                    severity="info"
                    icon={false}
                    sx={{ borderRadius: 2, py: 0.5, "& .MuiAlert-message": { width: "100%" } }}
                >
                    <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                        <Typography sx={{ fontSize: 13 }}>New password:</Typography>
                        <Typography component="code" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13.5, wordBreak: "break-all" }}>{generated}</Typography>
                        <Button
                            type="button"
                            size="small"
                            variant="outlined"
                            onClick={copy}
                            startIcon={copied ? <Check size={12} /> : <Copy size={12} />}
                            sx={{ ml: "auto", minWidth: 0, py: 0.1, textTransform: "none", fontSize: 12 }}
                        >
                            {copied ? "Copied" : "Copy"}
                        </Button>
                    </Stack>
                    {note && <Typography sx={{ fontSize: 12.5, mt: 0.5, opacity: 0.85 }}>{note}</Typography>}
                </Alert>
            )}
        </Box>
    );
};

export default GeneratePassword;
