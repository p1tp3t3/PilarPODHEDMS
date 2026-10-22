import AuthHeader from "@/Components/other/header";
import { AuthProvider } from "@/context-provider/auth-provider";
import { ReloadProvider } from "@/context-provider/reload-provider";
import '@/Responsive/sidebar-responsive.css'
import AuthSideBar from "@/Components/sidebar/auth-side-bar";
import { useEffect, useState } from "react";
import { PageTitleSlotContext } from "@/context-provider/page-title-provider";
import { usePage } from "@inertiajs/react";
import { showOutputModal } from "@/others/function";

const AuthLayout = ({ children, program = '' }) => {
    const path = window.location.pathname
    const { props } = usePage()
    // Every controller used to pass its own `user` prop for this layout —
    // inconsistently, since many built it as a bare auth()->user() without
    // eager-loading `profile`/`teachingStaff`/`nonTeachingStaff`. The shared
    // `auth.user` prop (HandleInertiaRequests) is always complete and
    // consistent, so the layout sources identity from there directly instead
    // of depending on every page controller remembering to pass it right.
    const user = props.auth?.user
    // The title bar's DOM node, handed to pages through context so their
    // <PageTitle> can portal into it (state, not useRef, so pages re-render
    // once it exists).
    const [titleSlot, setTitleSlot] = useState(null)

    useEffect(() => {
        if (localStorage.getItem('show-login-success') == 1) {
            localStorage.removeItem('show-login-success')
            showOutputModal(
                `Welcome ${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim(),
                'g',
                () => {}
            )
        }
    }, [user])

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
                    {/* Header + title bar stick together as one unit, so the
                        bar always sits right under the header whatever the
                        header's height (it differs on phones). */}
                    <div className="sticky top-0 z-20">
                        <AuthHeader
                            user={user}
                            addPicRoute={(path.includes('register')) ? '../' : ''}
                        />
                        {/* Page title bar: full width under the header, with its
                            text lined up with the content below (px-[2.5%]
                            matches the content's 95%-wide centred column).
                            Pages fill it via <PageTitle>; it hides itself
                            (empty:hidden) on pages that don't set a title. */}
                        <div
                            ref={setTitleSlot}
                            className="empty:hidden w-full bg-white border-b border-gray-200 shadow-sm px-3 md:px-[2.5%] py-2 sm:py-2.5"
                        />
                    </div>
                    <PageTitleSlotContext.Provider value={titleSlot}>
                    <div className="w-full md:w-[95%] px-3 md:px-0 pb-24 md:pb-0 min-w-0 overflow-x-hidden [&_.grid>*]:min-w-0" style={{margin: '0 auto'}}>
                        {children}
                    </div>
                    </PageTitleSlotContext.Provider>
                </div>
            </div>
        </ReloadProvider>
        </AuthProvider>
        </>
    )   
}
export default AuthLayout