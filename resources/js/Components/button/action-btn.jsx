import { Button } from "@mui/material"

// Tailwind's default palette for exactly the shades this app's ActionBtn
// callers actually pass in via `className` (bg-*/hover:bg-*/text-* across
// ~25 files). Needed because MUI's own Button base styles are injected at
// runtime (emotion) and, in this app's build, end up AFTER the compiled
// Tailwind stylesheet in the DOM — so at equal CSS specificity, MUI's own
// default text/background color wins over a plain Tailwind class passed
// through `className`, making every ActionBtn render as a plain blue link
// regardless of the color a caller asked for. Resolving the caller's
// intended color here and applying it via `sx` sidesteps that: `sx` is
// MUI's own mechanism for overriding a component's base styles, so it
// reliably wins where a plain passed-through className did not.
const TAILWIND_COLORS = {
    gray: { 100: '#f3f4f6', 200: '#e5e7eb', 400: '#9ca3af', 600: '#4b5563', 700: '#374151', 800: '#1f2937' },
    blue: { 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af' },
    green: { 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
    red: { 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b' },
    amber: { 600: '#d97706', 700: '#b45309' },
    indigo: { 600: '#4f46e5', 700: '#4338ca' },
    orange: { 500: '#f97316', 600: '#ea580c', 700: '#c2410c' },
}

const matchColor = (className, prefix) => {
    if (!className) return null
    const match = className.match(new RegExp(`(?:^|\\s)${prefix}-([a-z]+)-(\\d+)(?:\\s|$)`))
    return match ? (TAILWIND_COLORS[match[1]]?.[match[2]] ?? null) : null
}

const ActionBtn = ({
    children,
    onClick,
    className,
    disabled = false,
    title,
}) => {
    const bg = matchColor(className, 'bg') ?? '#3b82f6'
    const bgHover = matchColor(className, 'hover:bg') ?? bg
    const text = /(?:^|\s)text-white(?:\s|$)/.test(className || '') || !matchColor(className, 'text')
        ? '#fff'
        : matchColor(className, 'text')

    return (
        <Button
            type="button"
            variant="contained"
            disableElevation
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={className}
            sx={{
                textTransform: 'none',
                fontSize: '0.9em',
                px: 1.5,
                py: 1,
                borderRadius: '0.375rem',
                minWidth: 'auto',
                bgcolor: bg,
                color: text,
                '&:hover': { bgcolor: bgHover },
                '&.Mui-disabled': { bgcolor: bg, color: text, opacity: 0.6 },
            }}
        >
            {children}
        </Button>
    )
}

export default ActionBtn
