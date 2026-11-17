import { useEffect, useState } from 'react'
import { CircularProgress, IconButton, InputAdornment, TextField } from '@mui/material'
import { Eye, EyeOff } from 'lucide-react'

// The previous design, as an MUI filled field: a grey box with a dark-blue
// line under it that turns lighter blue from the middle on focus, a small
// label that floats up, 12px text, the error in red under it. (Its classes
// let dark mode recolour it, as before.)
const fieldSx = (isTextarea, hasIcon) => ({
    '& .MuiFilledInput-root': {
        bgcolor: '#e5e7eb',
        borderRadius: 0,
        fontSize: '12px',
        minHeight: isTextarea ? '10rem' : '2.6rem',
        alignItems: isTextarea ? 'flex-start' : 'center',
        '&:hover, &.Mui-focused': { bgcolor: '#e5e7eb' },
        '&::before, &:hover:not(.Mui-disabled, .Mui-error)::before': { borderBottom: '1px solid #1d4ed8' },
        '&::after': { borderBottom: '1px solid #3b82f6' },
        '&.Mui-readOnly-field': { bgcolor: '#f3f4f6', cursor: 'not-allowed', '&::before': { borderBottomColor: '#d1d5db' }, '&::after': { display: 'none' } },
    },
    '& .MuiFilledInput-input': { py: isTextarea ? 0 : '6px', pt: isTextarea ? '22px' : '18px' },
    // The global form styles' focus ring: the underline shows focus instead.
    '& .MuiFilledInput-input, & .MuiFilledInput-input:focus': { outline: 'none', boxShadow: 'none', border: 0 },
    '& .MuiInputLabel-root': { fontSize: '12px', color: 'text.secondary' },
    // With an icon, the label starts after it (as before).
    '& .MuiInputLabel-root.MuiInputLabel-shrink': { transform: `translate(${hasIcon ? 38 : 12}px, 5px) scale(0.75)` },
    '& .MuiInputLabel-root:not(.MuiInputLabel-shrink)': { transform: `translate(${hasIcon ? 38 : 12}px, 12px) scale(1)` },
    '& .MuiInputLabel-root.Mui-focused': { color: '#1d4ed8' },
    // Icons (the field's own, the password eye) in the app's blue, as before.
    '& .MuiInputAdornment-root': { mt: '0 !important', color: '#1d4ed8' },
    '& .MuiInputAdornment-root .MuiIconButton-root': { color: '#1d4ed8' },
    '& .MuiFormHelperText-root': { mx: 0, mt: 0.25, fontWeight: 600, fontSize: 13, color: '#d12323' },
})

// Date / time inputs always show their own placeholder, so their label sits on top.
const SHRINK_TYPES = ['date', 'time', 'datetime-local', 'month', 'week']

/**
 * The app's text field: an MUI TextField. Same props as before: `val` /
 * `change`, `error`, `allow` (alpha, numeric, ... typed characters are
 * checked), `checkExists` (async "already taken?" check, debounced),
 * `enableShowPassword`, `length` (max length), `min` / `max`, `readOnly`,
 * `icon` (shown at the start), type="textarea" for several lines.
 */
const FormTextfield = ({
    label = null,
    type = 'text',
    name = null,
    val = '',
    id = '',
    error = null,
    change = null,
    icon: Icon = null,
    color = null,
    req = false,
    length = null,
    allow = null,
    checkExists = null,
    enableShowPassword = false,
    setExist,
    errorAsterisk = false,
    min = null,
    max = null,
    readOnly = false
}) => {
    const [localError, setLocalError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [focused, setFocused] = useState(false)

    const getAllowPattern = () => {
        switch(allow) {
            case 'alpha':
                return "[A-Za-z]+"
            case 'numeric':
                return '[0-9]+'
            case 'alphanumeric':
                return '[A-Za-z0-9]+'
            case 'alphanumeric_space':
                return '[A-Za-z0-9 ]+'
            case 'alpha_space':
                return '[A-Za-z ]+'
            default:
                return ''
        }
    }

    const validateInput = (value) => {
        const regexStr = getAllowPattern()
        if (regexStr) {
            const regex = new RegExp(regexStr)
            if (!regex.test(value)) {
                setLocalError(`Invalid input format for ${allow.replace("_", " ")}`)
                return false
            }
        }
        setLocalError(null)
        return true
    }

    useEffect(() => {
        if (!val || typeof checkExists !== "function") {
            setLoading(false)
            return
        }

        let cancelled = false
        setLoading(true)

        const handler = setTimeout(async () => {
            try {
                const exists = await checkExists(val)
                setExist(exists)

                if (!cancelled) {
                    const isCurrentPass = ((type == 'password') ? !exists : exists)
                    if (isCurrentPass) {
                        setLocalError((type != 'password') ? `${label || 'This'} Is Already Exists` : `Wrong Password. Please Try Again.`)
                    } else {
                        // only clear if no format error already set
                        setLocalError((prev) =>
                            prev && prev.startsWith("Invalid") ? prev : null
                        )
                    }
                    setLoading(false)
                }
            } catch (err) {
                if (!cancelled) setLoading(false)
            }
        }, 500) // debounce

        return () => {
            cancelled = true
            clearTimeout(handler)
        }
    }, [val])

    const isTextarea = type === 'textarea'
    const message = localError || error

    const end = (loading || (enableShowPassword && type === 'password')) && (
        <InputAdornment position="end">
            {loading && <CircularProgress size={16} />}
            {enableShowPassword && type === 'password' && (
                <IconButton size="small" edge="end" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((p) => !p)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </IconButton>
            )}
        </InputAdornment>
    )

    return (
        <TextField
            fullWidth
            variant="filled"
            size="small"
            label={label}
            name={name ?? undefined}
            id={id || undefined}
            value={val ?? ''}
            type={isTextarea ? undefined : (type === 'password' && showPassword) ? 'text' : type}
            multiline={isTextarea}
            minRows={isTextarea ? 5 : undefined}
            maxRows={isTextarea ? 12 : undefined}
            error={!!message}
            helperText={message || undefined}
            onChange={(e) => {
                if (isTextarea || validateInput(e.target.value)) change && change(e)
            }}
            sx={fieldSx(isTextarea, !!Icon)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            slotProps={{
                // The asterisk only (the forms validate themselves).
                inputLabel: { required: req || errorAsterisk, shrink: SHRINK_TYPES.includes(type) || readOnly || focused || (val ?? '') !== '' },
                htmlInput: {
                    maxLength: length ?? undefined,
                    min: min ?? undefined,
                    max: max ?? undefined,
                    readOnly,
                    tabIndex: readOnly ? -1 : undefined,
                    // As before: only a textarea carried the browser's `required`.
                    required: isTextarea && req ? true : undefined,
                },
                input: {
                    ...(Icon && { startAdornment: <InputAdornment position="start"><Icon size={15} /></InputAdornment> }),
                    ...(end && { endAdornment: end }),
                    className: readOnly ? 'bg-gray-100 Mui-readOnly-field' : 'bg-gray-200',
                },
            }}
        />
    )
}

export default FormTextfield
