import FormTextfield from "./input/form-input"
import FormButton from "./button/button"
import header from '../images/pilar.png'
import { useForm } from "@inertiajs/react"
import { change } from "../others/function"
import { useRoute } from "../../../vendor/tightenco/ziggy/src/js"
import { User, Lock } from "lucide-react"
import { validateForm, hasErrors, required } from "@/others/validation"


const GatePassLogInForm = (props) => {
    const route = useRoute()

    const {data, setData, post, processing, errors, setError, clearErrors } = useForm({
        route_to: 'gatepass-scanner',
        username: '',
        password: ''
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        const found = validateForm(data, { username: [required("Username")], password: [required("Password")] })
        clearErrors()
        if (hasErrors(found)) {
            Object.entries(found).forEach(([k, v]) => { if (!k.endsWith("Asterisk")) setError(k, v) })
            return
        }
        props.loadRegister(true, 'logo')
        setTimeout(() => {
            post(route('log-in'), {
                onError: () => props.loadRegister(false)
            })
        }, 3000)
    }
    const handleChange = (e) => {
        change(e, setData)
    }
    return (
        <div className={`w-full max-w-[26rem] mx-4 p-[24px] sm:p-[40px] sm:pr-[50px] sm:pl-[50px] bg-[#ffffff] rounded-[5px] frm`}>
            <form className="flex flex-col gap-10" onSubmit={handleSubmit} method="post">
                <div className="w-[100%] grid place-items-center">
                    <div className="grid place-items-center">
                        <div className="grid place-items-center">
                            <img className="object-cover" width={100} src={header} alt="header" />
                            <h1 className="text-[1.3em] text-center"><b>Gate Pass QRCode Scanner</b></h1>
                        </div>
                        <h1 className="text-[0.9em]">Log in your Guard Account to Continue</h1>
                    </div>
                </div>
                <div className="flex flex-col gap-7">
                    <div className="flex flex-col gap-3">
                        <FormTextfield 
                            label="Username / ID No." 
                            name="username" 
                            id='username'
                            val={data.username}
                            error={errors.username}
                            change={handleChange} 
                            icon={User}
                            req={true}
                            color={{ border: 'border-blue-700', bg: 'bg-gray-200' }} />
                        <FormTextfield 
                            label="Password" 
                            type="password" 
                            name="password" 
                            id='password'
                            val={data.password}
                            error={errors.password}
                            change={handleChange} 
                            icon={Lock}
                            req={true}
                            color={{ border: 'border-blue-700', bg: 'bg-gray-200' }} />
                    </div>
                    <div className="w-full grid gap-3">
                        <FormButton label='Log in' type="submit" />
                    </div>
                </div>
            </form>
        </div>
    )
}
export default GatePassLogInForm