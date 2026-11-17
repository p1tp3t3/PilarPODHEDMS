import { Dialog } from "@mui/material"

/**
 * A small centred dialog (MUI) for alerts and confirmations. Same props as
 * before: `close` (open), `closeModal`, `isEnableOuterClose` (the backdrop
 * closes it), `w` / `pd` (Tailwind width and padding of the panel).
 */
const AlertModal = ({
    children,
    close = false,
    w = "w-[25rem]",
    pd = ["px-3", "py-2"],
    bgColor = "bg-white",
    textColor = "text-black",
    isEnableOuterClose = false,
    closeModal = () => {},
}) => {
    const colours = [bgColor !== "bg-white" && bgColor, textColor !== "text-black" && textColor].filter(Boolean).join(" ")

    return (
        <Dialog
            open={!!close}
            onClose={() => isEnableOuterClose && closeModal(false)}
            keepMounted
            maxWidth={false}
            // Slow and smooth, like the other modals.
            transitionDuration={{ enter: 450, exit: 300 }}
            // Same layer as before (z 200): under the full-page loader.
            sx={{ zIndex: 200 }}
            slotProps={{
                paper: {
                    className: `${w} ${pd[0]} ${pd[1]} ${colours}`,
                    sx: { m: 2, maxWidth: "calc(100vw - 32px)", borderRadius: 2, overflow: "hidden", "&:focus, &:focus-visible": { outline: "none" } },
                },
            }}
        >
            {children}
        </Dialog>
    )
}
export default AlertModal
