import CircleReload from '../reload/circle-reload'
import './style.css'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'

const FormTextfield = ({
    label = null,
    type = 'text',
    name = null,
    val = '',
    id = '',
    error = null,
    change = null,
    icon: Icon = null,
    color = { border: 'border-blue-700', bg: 'bg-gray-200' },
    req = false,
    length = null,
    allow = null,
    checkExists = null,
    enableShowPassword = false,
    setExist,
    errorAsterisk = false,
    min = null,
    max = null
}) => {
    const [focus, setFocus] = useState(false)
    const [localError, setLocalError] = useState(null)
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const isStretched = focus || val !== ''

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
    }, [val]) // 👈 only depends on value

    return (
        <div className='w-full flex flex-col'>
            <div className={`w-[100%] ${(type != 'textarea') ? 'h-[2.6rem]' : 'h-[10rem]'} frm-inpt-brdr border-b-[1px] ${color.border} ${color.bg} relative`}>
                <div className="flex items-center gap-2 pr-3 pl-3">
                    {Icon &&
                    <div className='text-[13px]'>
                        <Icon size={13} className={`${isStretched ? 'text-blue-700' : ''} transition-colors duration-300`} />
                    </div>}
                    <div className={`h-[100%] w-[100%] relative flex flex-col ${(type != 'textarea') ? 'justify-center' : ''}`}>
                        {(type != 'textarea')
                        ?
                        <input
                            value={val}
                            placeholder=''
                            className='text-[12px] h-full'
                            type={(type === 'password' && showPassword) ? 'text' : type}
                            name={name}
                            id={id}
                            min={min}
                            max={max}
                            onChange={(e) => {
                                const value = e.target.value
                                if (validateInput(value)) {
                                    change && change(e)
                                }
                            }}
                            maxLength={length}
                        />
                        :
                        <textarea
                            placeholder='' 
                            className='text-[12px] resize-none h-[80%]'
                            name={name} 
                            id={id} 
                            onChange={change} 
                            required={req}
                            value={val}
                            >
                                {val}
                        </textarea>}
                        <label className="absolute z-[0] cursor-text" htmlFor={id}>{label} {errorAsterisk && <span className='text-[#d12323] '>*</span>}</label>
                        {loading && (
                            <span className="absolute right-0 top-1/2 -translate-y-1/2">
                                <CircleReload size={1.2} />
                            </span>
                        )}
                        {enableShowPassword && type === 'password' && (
                            <span
                                className="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer text-blue-800"
                                onClick={() => setShowPassword((prev) => !prev)}
                            >
                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </span>
                        )}
                    </div>
                </div>
                <motion.div
                    className="justify-self-center h-[1px] self-end bg-blue-500 absolute"
                    animate={{ width: isStretched ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                ></motion.div>
            </div>
            <div className="text-[#d12323] text-[13px] flex items-center gap-2">
                <div className="transition-[0.2s] font-[600]">
                    {localError || error}
                </div>
            </div>
        </div>
    )
} 



const Normal = (props) => {
    return (
        <div className="input-group-2">
            <input required="" type="text" name="text" autocomplete="off" className="input-2" />
            <label className="user-label">First Name</label>
        </div>
    )
}

FormTextfield.Normal = Normal
export default FormTextfield