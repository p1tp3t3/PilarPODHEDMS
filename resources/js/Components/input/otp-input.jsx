import { forwardRef, useImperativeHandle, useRef } from "react"
import { Box, InputBase } from "@mui/material"

/**
 * The 6-digit code boxes (forgot password, the change-password check).
 * `value` is an array of single digits; `onChange(nextArray)` gets every
 * edit, and `onComplete(code)` fires once all boxes are filled. Typing moves
 * to the next box, Backspace on an empty box goes back, and pasting a code
 * into any box fills them all. `ref.focus()` focuses the first box.
 */
const OtpInput = forwardRef(({ value, onChange, onComplete, disabled = false, error = false, masked = true }, ref) => {
    const inputs = useRef([])
    useImperativeHandle(ref, () => ({ focus: () => inputs.current[0]?.focus() }))

    const commit = (next, focusAt) => {
        onChange(next)
        if (focusAt != null) inputs.current[Math.min(focusAt, value.length - 1)]?.focus()
        if (next.every((d) => d !== "")) onComplete?.(next.join(""))
    }

    const handleChange = (e, i) => {
        const digits = e.target.value.replace(/\D/g, "")
        // A pasted / autofilled code: spread it from this box on.
        if (digits.length > 1) {
            const next = [...value]
            digits.slice(0, value.length - i).split("").forEach((d, k) => { next[i + k] = d })
            commit(next, i + digits.length)
            return
        }
        const next = [...value]
        next[i] = digits
        commit(next, digits ? i + 1 : null)
    }

    const handleKeyDown = (e, i) => {
        if (e.key === "Backspace" && !value[i] && i > 0) inputs.current[i - 1]?.focus()
        if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus()
        if (e.key === "ArrowRight" && i < value.length - 1) inputs.current[i + 1]?.focus()
    }

    return (
        <Box sx={{ display: "flex", justifyContent: "center", gap: { xs: 0.75, sm: 1.25 } }}>
            {value.map((d, i) => (
                <InputBase
                    key={i}
                    inputRef={(el) => (inputs.current[i] = el)}
                    value={d}
                    disabled={disabled}
                    onChange={(e) => handleChange(e, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    onFocus={(e) => e.target.select()}
                    inputProps={{
                        inputMode: "numeric",
                        autoComplete: i === 0 ? "one-time-code" : "off",
                        "aria-label": `Digit ${i + 1}`,
                        type: masked ? "password" : "text",
                    }}
                    sx={{
                        width: { xs: 42, sm: 50 },
                        height: { xs: 50, sm: 58 },
                        borderRadius: 2,
                        border: "1.5px solid",
                        borderColor: error ? "error.main" : d ? "primary.main" : "divider",
                        bgcolor: "background.paper",
                        transition: "border-color .15s, box-shadow .15s",
                        "&.Mui-focused": {
                            borderColor: error ? "error.main" : "primary.main",
                            boxShadow: (t) => `0 0 0 3px ${error ? t.palette.error.main : t.palette.primary.main}33`,
                        },
                        "& input": {
                            textAlign: "center",
                            fontSize: { xs: 20, sm: 24 },
                            fontWeight: 600,
                            p: 0,
                            height: "100%",
                            outline: "none !important",
                            boxShadow: "none !important",
                        },
                    }}
                />
            ))}
        </Box>
    )
})

export default OtpInput
