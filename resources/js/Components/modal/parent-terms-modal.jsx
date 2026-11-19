import UpModal from "./up-modal";
import FormButton from "../button/button";
import { Box, Button, Stack, Typography } from "@mui/material";
import { readableDate } from "@/others/function";

// Terms and Conditions a parent/guardian must agree to before registering
// (parent-registration-form.jsx). The text is edited by the System Admin
// (System Settings → Terms and Conditions) and comes in as `terms`
// ({ content, version, updated_at }). Uses the app's UpModal, which slides
// up (a bottom sheet on phones). "I Agree" closes it and ticks the box.
// Without `onAgree` (the admin's preview) only Close is shown.

// The saved rich text (headings, lists, …), styled.
export const TermsContent = ({ html, sx }) => (
    <Box
        sx={{
            fontSize: "0.875rem", lineHeight: 1.7, color: "text.secondary", wordBreak: "break-word",
            "& p": { m: 0, mb: 1 }, "& p:last-child": { mb: 0 },
            "& h1, & h2, & h3": { color: "text.primary", fontWeight: 700, m: 0, mt: 1.75, mb: 0.75 },
            "& h1": { fontSize: "1.25em" }, "& h2": { fontSize: "1.12em" }, "& h3": { fontSize: "1em" },
            "& > :first-of-type": { mt: 0 },
            "& ul, & ol": { pl: 2.5, m: 0, mb: 1 },
            "& ul": { listStyle: "disc" }, "& ol": { listStyle: "decimal" },
            "& ul ul": { listStyle: "circle" },
            "& li > p": { mb: 0.25 },
            "& blockquote": { m: 0, mb: 1, pl: 1.5, borderLeft: 3, borderColor: "divider" },
            "& hr": { border: 0, borderTop: 1, borderColor: "divider", my: 1.5 },
            "& u": { textDecoration: "underline" },
            "& strong, & b": { color: "text.primary" },
            ...sx,
        }}
        dangerouslySetInnerHTML={{ __html: html ?? "" }}
    />
);

const ParentTermsModal = ({ open, onClose, onAgree, terms }) => (
    <UpModal
        close={open}
        closeModal={(v) => { if (!v) onClose(); }}
        isEnableOuterClose={true}
        cntr={true}
        pd={["px-6", "py-5"]}
        bgColor="bg-white"
        w="w-[40rem]"
    >
        <Box sx={{ width: "100%", display: "grid", gap: 2 }} role="dialog" aria-modal="true" aria-labelledby="parent-terms-title">
            <Box sx={{ borderBottom: 1, borderColor: "divider", pb: 1.5, pr: 3 }}>
                <Typography id="parent-terms-title" component="h2" sx={{ fontSize: 20, fontWeight: 600 }}>
                    Terms and Conditions
                </Typography>
            </Box>

            {/* The text scrolls between the title and the buttons. */}
            <Box sx={{ maxHeight: { md: "60vh" }, overflowY: { md: "auto" }, pr: { md: 1 }, display: "grid", gap: 2 }}>
                <Typography sx={{ fontSize: "0.875rem", lineHeight: 1.7, color: "text.secondary" }}>
                    Please read these terms before registering for a parent/guardian account in the Pilar College
                    Prefect of Discipline system. By ticking the box and registering, you agree to them.
                </Typography>
                <TermsContent html={terms?.content} />
                {terms?.updated_at && (
                    <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", opacity: 0.85 }}>
                        Last updated: {readableDate(terms.updated_at)}
                    </Typography>
                )}
            </Box>

            <Stack direction={{ xs: "column-reverse", sm: "row" }} sx={{ justifyContent: "flex-end", gap: 1, borderTop: 1, borderColor: "divider", pt: 2 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    color="inherit"
                    sx={{ borderRadius: "999px", px: "2rem", py: "0.5rem", fontSize: "13px" }}
                >
                    Close
                </Button>
                {onAgree && <FormButton label="I Agree" click={onAgree} />}
            </Stack>
        </Box>
    </UpModal>
);

export default ParentTermsModal;
