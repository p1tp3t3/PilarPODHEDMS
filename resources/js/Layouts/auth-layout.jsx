import AuthHeader from "@/Components/other/header";
import { AuthProvider } from "@/context-provider/auth-provider";
import { ReloadProvider } from "@/context-provider/reload-provider";
import '@/Responsive/sidebar-responsive.css'
import AuthSideBar from "@/Components/sidebar/auth-side-bar";
import { useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { showOutputModal, registerServiceWorker } from "@/others/function";

const AuthLayout = ({ children, user, program = '' }) => {
    const path = window.location.pathname
    const { props } = usePage()

    useEffect(() => {
        if(localStorage.getItem('show-login-success') == 1) {
            showOutputModal(
                `Welcome ${user.profile?.first_name} ${user.profile?.last_name}`,
                'g',
                () => {
                    localStorage.removeItem('show-login-success')
                }
            )
        }
    }, [])

    useEffect(() => {
        registerServiceWorker(props.vapid_public_key)
    }, [props.vapid_public_key])
    
    return (
        <>
        <AuthProvider usr={user} >
        <ReloadProvider>
            <div className="w-full flex bg-gray-100">
                <AuthSideBar
                    usr={user}
                    program={program}
                    addPicRoute={(path.includes('register')) ? '../' : ''}
                />
                <div className="w-full min-w-0">
                    <AuthHeader
                        user={user}
                        addPicRoute={(path.includes('register')) ? '../' : ''}
                    />
                    <div className="w-[95%] min-w-0 overflow-x-hidden" style={{margin: '0 auto'}}>
                        {children}
                    </div>
                </div>
            </div>
        </ReloadProvider>
        </AuthProvider>
        </>
    )   
}
export default AuthLayout