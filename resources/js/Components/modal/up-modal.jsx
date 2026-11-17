import { Dialog, IconButton, useMediaQuery } from "@mui/material";
import { X } from "lucide-react";

const EASE_IN = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_OUT = "cubic-bezier(0.4, 0, 1, 1)";

/**
 * The app's modal: an MUI Dialog. Same props as before, so every modal
 * keeps working: `close` (open), `closeModal`, `isEnableOuterClose` (the
 * backdrop and an ✕ close it), `w` / `pd` (Tailwind width and padding of
 * the panel). A tall modal scrolls with the page; on phones it's a bottom
 * sheet that scrolls inside itself. Its content stays mounted while closed
 * (forms keep their state, as before).
 */
const UpModal = ({
  children,
  close = false,
  cntr = false,
  w = "w-auto",
  pd = ["px-3", "py-2"],
  bgColor = "bg-white",
  textColor = "text-black",
  isEnableOuterClose = false,
  closeModal = () => {},
}) => {
  // `cntr` is kept for callers; a short modal is always centred now.
  const isPhone = useMediaQuery("(max-width: 767.98px)");

  // Only the defaults are left to the theme (light / dark paper).
  const colours = [bgColor !== "bg-white" && bgColor, textColor !== "text-black" && textColor].filter(Boolean).join(" ");

  return (
    <Dialog
      open={!!close}
      onClose={() => isEnableOuterClose && closeModal(false)}
      keepMounted
      maxWidth={false}
      scroll={isPhone ? "paper" : "body"}
      // Slow and smooth: the modal and its backdrop fade in (MUI Fade) while
      // the panel rises (below); a quicker fade and drop going out.
      transitionDuration={{ enter: 550, exit: 350 }}
      // No jump when it opens: focus isn't moved into it (which scrolled a
      // tall modal down to the focused part) and it opens at its top.
      disableAutoFocus
      // Same layer as before (z 200): under the full-page loader, over the app.
      sx={{
        zIndex: 200,
        ...(isPhone && { "& .MuiDialog-container": { alignItems: "flex-end" } }),
      }}
      slotProps={{
        transition: {
          easing: { enter: EASE_IN, exit: EASE_OUT },
          onEnter: (node) => {
            node.scrollTop = 0;
            const paper = node.querySelector(".MuiDialog-paper");
            if (paper) paper.scrollTop = 0;
          },
        },
        paper: {
          "data-modal-panel": true,
          className: `${w} ${pd[0]} ${pd[1]} ${colours}`,
          sx: {
            position: "relative",
            borderRadius: 2,
            // Rises into place as it fades in; drops back as it fades out.
            // `none` when open: a transform would break fixed-position content
            // inside (the rich-text editor's full-screen mode).
            transform: close ? "none" : "translateY(48px)",
            transition: close ? `transform 550ms ${EASE_IN}` : `transform 350ms ${EASE_OUT}`,
            // The dialog takes focus when it opens: no outline around it.
            "&:focus, &:focus-visible": { outline: "none" },
            maxWidth: "95vw",
            ...(isPhone && {
              m: 0,
              width: "100% !important",
              maxWidth: "100% !important",
              maxHeight: "92dvh",
              borderRadius: "16px 16px 0 0",
              overflowY: "auto",
              px: "16px !important",
              pt: "28px !important",
              pb: "calc(1.25rem + env(safe-area-inset-bottom)) !important",
            }),
          },
        },
      }}
    >
      {/* Phones: the bottom sheet's grab handle. */}
      {isPhone && (
        <span aria-hidden="true" style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", height: 6, width: 40, borderRadius: 999, background: "#d1d5db" }} />
      )}
      {isEnableOuterClose && (
        <IconButton
          onClick={() => closeModal(false)}
          aria-label="Close modal"
          size="small"
          sx={{ position: "absolute", top: 6, right: 8, zIndex: 1, color: "text.secondary" }}
        >
          <X size={18} />
        </IconButton>
      )}
      {children}
    </Dialog>
  );
};

export default UpModal;
