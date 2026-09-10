import { Switch as MuiSwitch } from "@mui/material"

// Every caller passes `effect` as a [offClass, onClass] pair of Tailwind
// bg-* utility classes (e.g. ["bg-red-600", "bg-green-600"]) rather than raw
// colors, so the MUI Switch underneath needs the same small class->hex
// lookup used by ActionBtn for the same reason (MUI's own injected styles
// otherwise outrank a plain className).
const TAILWIND_COLORS = {
    gray: { 300: '#d1d5db', 600: '#4b5563', 800: '#1f2937' },
    red: { 600: '#dc2626' },
    green: { 600: '#16a34a' },
}

const colorFromClass = (cls) => {
    const match = cls?.match(/bg-([a-z]+)-(\d+)/)
    return (match && TAILWIND_COLORS[match[1]]?.[match[2]]) || '#6b7280'
}

const Switch = ({
    checked = false,
    onChange = () => {},
    effect = ['bg-gray-600', 'bg-gray-800'],
}) => {
    const offColor = colorFromClass(effect[0])
    const onColor = colorFromClass(effect[1])

    return (
        <MuiSwitch
            checked={checked}
            onChange={onChange}
            sx={{
                '& .MuiSwitch-track': {
                    backgroundColor: offColor,
                    opacity: 1,
                },
                '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#fff',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: onColor,
                    opacity: 1,
                },
            }}
        />
    )
}
export default Switch
