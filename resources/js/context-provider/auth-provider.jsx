import { createContext, useState, useEffect, useMemo } from "react"


const AuthContext = createContext()

export function AuthProvider ({ children , usr }) {
    const  [toast, openToast] = useState(false),
           [toastLabel, setToastLabel] = useState(''),
           [toastIcon, setToastIcon] = useState(''),
           [onlineMembers, setOnlineMembers] = useState(new Map()),
           // When someone leaves the presence channel, so lists can show
           // "Active Xm ago" from that moment instead of a stale page-load value.
           [leftAt, setLeftAt] = useState(new Map())

    const showToast = (label, icon) => {
        openToast(true)
        setToastLabel(label)
        setToastIcon(icon)
        setTimeout(() => openToast(false), 5000)
    }

    useEffect(() => {
        if (!usr?.id || typeof window === 'undefined' || !window.Echo) return

        const channel = window.Echo.join('online-users')
            .here((users) => {
                setOnlineMembers(new Map(users.map((u) => [u.id, { ...u, online_since: Date.now() }])))
            })
            .joining((user) => {
                setOnlineMembers((prev) => new Map(prev).set(user.id, { ...user, online_since: Date.now() }))
            })
            .leaving((user) => {
                setLeftAt((prev) => new Map(prev).set(user.id, new Date().toISOString()))
                setOnlineMembers((prev) => {
                    const next = new Map(prev)
                    next.delete(user.id)
                    return next
                })
            })

        return () => window.Echo.leave('online-users')
    }, [usr?.id])

    const onlineUserIds = useMemo(() => new Set(onlineMembers.keys()), [onlineMembers])
    const onlineUsers = useMemo(() => [...onlineMembers.values()], [onlineMembers])
    const isUserOnline = (userId) => onlineMembers.has(userId)
    const lastSeenOf = (userId, fallback) => leftAt.get(userId) ?? fallback

    return (
        <AuthContext.Provider value={{ usr , toast, toastLabel, toastIcon, showToast, openToast, onlineUserIds, onlineUsers, isUserOnline, lastSeenOf }}>
            {children}
        </AuthContext.Provider>
    )
}
export default AuthContext