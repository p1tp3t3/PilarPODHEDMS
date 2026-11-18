import AuthLayout from "@/Layouts/auth-layout"
import { useState, useEffect, useLayoutEffect, useRef, useContext } from "react"
import { Head, usePage, router } from "@inertiajs/react"
import ProfilePic from "@/Components/other/profile-pic"
import { getProfilePic, readableDate, readableTime, toTitleCase, showUserType, showWarningModal, checkActiveStatus, readableActiveDuration , showOutputModal } from "@/others/function"
import { ChatService } from "@/others/services/chat-service"
import { UserService } from "@/others/services/user-service"
import { Broadcast } from "@/others/classes/broadcast-cofiguration"
import AuthContext from "@/context-provider/auth-provider"
import { Send, Reply, X, Check, CheckCheck, Trash2, Pencil, History, ArrowLeft, MoreHorizontal, Search, MessagesSquare } from "lucide-react"
import {
    Alert, Avatar, Badge, Box, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, IconButton, InputBase,
    List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Paper, Stack, Tooltip, Typography,
} from "@mui/material"

// Only admins (prefect/itrc) can message any user — canChat() on the
// backend treats sub_admin/super_admin identically as the "hub" in a
// hub-and-spoke model, so only they get a broad search; everyone else's
// contacts are always just the admin(s), already fully listed.
const isAdminRole = (role) => role === 'sub_admin' || role === 'super_admin'

const fullName = (c) => `${c?.profile?.first_name ?? ''} ${c?.profile?.last_name ?? ''}`.trim()
const toDate = (at) => new Date(String(at).replace(' ', 'T'))
const sameDay = (a, b) => toDate(a).toDateString() === toDate(b).toDateString()
// "Today", "Yesterday", or the date — the separator between days.
const dayLabel = (at) => {
    const d = toDate(at)
    const today = new Date()
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return readableDate(at)
}
// Messages from the same person within 5 minutes read as one group.
const GROUP_MS = 5 * 60 * 1000
// A message can be edited only within 15 minutes of sending it
// (ChatController::EDIT_WINDOW_MINUTES — the server enforces it too).
const EDIT_WINDOW_MS = 15 * 60 * 1000
const canStillEdit = (m) => Date.now() - toDate(m.created_at).getTime() < EDIT_WINDOW_MS

const Chat = ({ contacts: initialContacts, open: openProp = null }) => {
    // ChatController::index() reads the signed-in user from the shared
    // `auth.user` prop (HandleInertiaRequests), the same one AuthLayout uses.
    const { props } = usePage()
    const user = props.auth?.user
    const { isUserOnline } = useContext(AuthContext)
    const [contacts, setContacts] = useState(initialContacts || [])
    const [activeId, setActiveId] = useState(null)
    const [activeEncryptedId, setActiveEncryptedId] = useState(null)
    const [search, setSearch] = useState("")
    const [searchResults, setSearchResults] = useState(null)
    const canSearch = isAdminRole(user.role)
    const [messages, setMessages] = useState([])
    const [loadingThread, setLoadingThread] = useState(false)
    const [body, setBody] = useState("")
    const [sending, setSending] = useState(false)
    // The message being unsent: faded, with a small circular loader (no popup).
    const [unsendingId, setUnsendingId] = useState(null)
    const [replyingTo, setReplyingTo] = useState(null)
    const [editingMessage, setEditingMessage] = useState(null)
    const [historyMessageId, setHistoryMessageId] = useState(null)
    const [historyData, setHistoryData] = useState(null)
    // Anchored actions menu (a button, not hover-only, so touch works too).
    const [actionMenu, setActionMenu] = useState(null) // { anchorEl, message } | null
    const bottomRef = useRef(null)
    const listRef = useRef(null)
    const cardRef = useRef(null)
    const activeIdRef = useRef(activeId)
    const activeEncryptedIdRef = useRef(activeEncryptedId)
    const messageRefs = useRef({})
    const textareaRef = useRef(null)
    const isTouchDevice = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
    // The keyboard hint only fits in the message box on wide screens.
    const isWide = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches

    useEffect(() => { activeIdRef.current = activeId }, [activeId])

    // Which conversation is open on screen, for the header: a new message
    // from that person makes no sound (you're already talking with them).
    useEffect(() => {
        window.__openChatUserId = activeId
        return () => { if (window.__openChatUserId === activeId) window.__openChatUserId = null }
    }, [activeId])

    // Live conversation list: on any chat event (a message to or from this
    // user, read, edited or unsent — here or in another tab/device) the list
    // is reloaded from the server, shortly after (bursts are merged). The
    // open conversation keeps 0 unread; one just started from a search with
    // no messages yet stays in the list.
    const refreshTimer = useRef(null)
    const refreshContacts = () => {
        clearTimeout(refreshTimer.current)
        refreshTimer.current = setTimeout(() => {
            ChatService.getContacts((d) => {
                const fresh = Array.isArray(d?.contacts) ? d.contacts : []
                setContacts((prev) => {
                    const openId = activeIdRef.current
                    const merged = fresh.map((c) => c.id === openId ? { ...c, unread_count: 0 } : c)
                    const openStub = prev.find((c) => c.id === openId && !fresh.some((f) => f.id === openId))
                    return openStub ? [openStub, ...merged] : merged
                })
            })
        }, 400)
    }
    useEffect(() => () => clearTimeout(refreshTimer.current), [])
    useEffect(() => { activeEncryptedIdRef.current = activeEncryptedId }, [activeEncryptedId])

    useEffect(() => {
        if (activeId == null) return
        setReplyingTo(null)
        setEditingMessage(null)
        setBody("")
        setMessages([])
        setLoadingThread(true)
        ChatService.getThread(activeEncryptedId, (d) => { setMessages(d.messages || []); setLoadingThread(false) }, () => setLoadingThread(false))
    }, [activeId])

    useEffect(() => {
        // Scroll the message list only (not the whole page).
        const list = listRef.current
        list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" })
    }, [messages])

    useEffect(() => {
        new Broadcast(
            'private',
            'chat.' + user.id,
            'MessageSent',
            (e) => {
                const msg = e.message

                if (msg.sender_id === activeIdRef.current) {
                    setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
                    ChatService.getThread(activeEncryptedIdRef.current, () => {})
                }
                refreshContacts()

                setContacts((prev) => {
                    const next = prev.map((c) => c.id === msg.sender_id
                        ? {
                            ...c,
                            last_message: msg.body,
                            last_message_at: msg.created_at,
                            unread_count: msg.sender_id === activeIdRef.current ? 0 : c.unread_count + 1,
                        }
                        : c
                    )
                    return [...next].sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))
                })
            }
        ).configure('enable chat')

        new Broadcast(
            'private',
            'chat.' + user.id,
            'MessagesRead',
            (e) => {
                if (e.reader_id !== activeIdRef.current) return
                setMessages((prev) => prev.map((m) => (
                    m.sender_id === user.id && !m.read_at ? { ...m, read_at: e.read_at } : m
                )))
            }
        ).configure('enable chat read receipts')

        new Broadcast(
            'private',
            'chat.' + user.id,
            'MessageUnsent',
            (e) => {
                setMessages((prev) => prev.map((m) => (
                    m.id === e.message_id ? { ...m, unsent_at: new Date().toISOString(), body: null } : m
                )))
                refreshContacts() // the list's last-message preview
            }
        ).configure('enable chat unsend')

        new Broadcast(
            'private',
            'chat.' + user.id,
            'MessageEdited',
            (e) => {
                setMessages((prev) => prev.map((m) => (
                    m.id === e.message_id ? { ...m, body: e.body, edited_at: e.edited_at } : m
                )))
                refreshContacts() // the list's last-message preview
            }
        ).configure('enable chat edit')

        // Something this user did elsewhere (another tab / device): sent,
        // read, edited or unsent a message. Reload the list, and the open
        // conversation so a message sent from the other tab shows here too.
        new Broadcast(
            'private',
            'chat.' + user.id,
            'ChatListChanged',
            () => {
                refreshContacts()
                if (activeEncryptedIdRef.current) {
                    ChatService.getThread(activeEncryptedIdRef.current, (d) => setMessages(d.messages || []))
                }
            }
        ).configure('enable chat list sync')
    }, [])

    // Search: existing contacts first (no API call); only when nothing local
    // matches, the backend search (cached by UserService.search).
    useEffect(() => {
        if (!canSearch) return

        const q = search.trim().toLowerCase()
        if (q === '') {
            setSearchResults(null)
            return
        }

        const localMatches = contacts.filter((c) => {
            const name = fullName(c).toLowerCase()
            return name.includes(q) || c.id_number?.toLowerCase().includes(q)
        })

        if (localMatches.length > 0) {
            setSearchResults(localMatches)
            return
        }

        const timeout = setTimeout(() => {
            UserService.search('/api/all-users/all-2', search, (data) => {
                const found = Array.isArray(data) ? data : []
                // The System Admin can't start a chat with a user — only reply to
                // one who messaged first, and those are already in contacts.
                setSearchResults(user.role === 'super_admin' ? found.filter((u) => isAdminRole(u.role)) : found)
            })
        }, 500)

        return () => clearTimeout(timeout)
    }, [search, contacts, canSearch])

    const active = contacts.find((c) => c.id === activeId)

    // Show a conversation (no URL change): mark it read in the list and add
    // the person if they came from a search or a /chat/{id} link.
    const showContact = (c) => {
        setActiveId(c.id)
        setActiveEncryptedId(c.encrypted_id ?? c.id)
        setContacts((prev) => {
            if (prev.some((p) => p.id === c.id)) {
                return prev.map((p) => p.id === c.id ? { ...p, unread_count: 0 } : p)
            }
            return [{ ...c, unread_count: 0, last_message: c.last_message ?? null, last_message_at: c.last_message_at ?? null }, ...prev]
        })
        setSearch("")
        setSearchResults(null)
    }

    // The address follows the conversation: /chat/{encrypted id}, or /chat
    // for the list. A client-side visit (no reload): the page's `open` prop
    // changes, and Back / Forward move between conversations.
    const openContact = (c) => {
        if (c.id === activeIdRef.current) return
        router.push({
            url: `/chat/${c.encrypted_id ?? c.id}`,
            props: (p) => ({ ...p, open: c }),
            preserveScroll: true,
            preserveState: true,
        })
    }
    const closeContact = () => router.push({ url: '/chat', props: (p) => ({ ...p, open: null }), preserveScroll: true, preserveState: true })

    // The `open` prop (from /chat/{id}, or a client-side visit above) decides
    // which conversation is shown.
    useEffect(() => {
        if (openProp) showContact(openProp)
        else { setActiveId(null); setActiveEncryptedId(null) }
    }, [openProp?.id])

    const handleSend = (e) => {
        e.preventDefault()
        const text = body.trim()
        if (!text || activeId == null || sending) return

        if (editingMessage) {
            const messageId = editingMessage.id
            setSending(true)
            ChatService.edit(messageId, text, () => {
                setSending(false)
                setBody("")
                setEditingMessage(null)
                setMessages((prev) => prev.map((m) => (
                    m.id === messageId ? { ...m, body: text, edited_at: new Date().toISOString() } : m
                )))
            }, (err) => {
                setSending(false)
                // e.g. the 15-minute edit window passed while typing.
                const msg = err?.response?.data?.message ?? err?.data?.message
                if (msg) { showOutputModal(msg, "e"); setEditingMessage(null); setBody("") }
            })
            return
        }

        const sentTo = activeId
        const sentToEncrypted = activeEncryptedId
        const replyId = replyingTo?.id ?? null
        setSending(true)
        ChatService.send(sentTo, text, replyId, () => {
            setSending(false)
            setBody("")
            setReplyingTo(null)
            ChatService.getThread(sentToEncrypted, (d) => setMessages(d.messages || []))
            setContacts((prev) => {
                const next = prev.map((c) => c.id === sentTo
                    ? { ...c, last_message: text, last_message_at: new Date().toISOString() }
                    : c
                )
                return [...next].sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))
            })
        }, () => setSending(false))
    }

    const startEdit = (m) => {
        setReplyingTo(null)
        setEditingMessage(m)
        setBody(m.body)
        textareaRef.current?.focus()
    }

    const cancelEdit = () => {
        setEditingMessage(null)
        setBody("")
    }

    const startReply = (m) => {
        setEditingMessage(null)
        setReplyingTo(m)
        textareaRef.current?.focus()
    }

    const openHistory = (messageId) => {
        setHistoryMessageId(messageId)
        setHistoryData(null)
        ChatService.getHistory(messageId, (d) => setHistoryData(d))
    }

    const handleKeyDown = (e) => {
        if (e.key !== 'Enter' || e.shiftKey || isTouchDevice) return
        e.preventDefault()
        handleSend(e)
    }

    const handleUnsend = (messageId) => {
        showWarningModal(
            'Unsend This Message? This removes it for both you and the other person.',
            'Unsend',
            'Cancel',
            () => {
                setUnsendingId(messageId)
                ChatService.unsend(messageId, () => {
                    setUnsendingId(null)
                    setMessages((prev) => prev.map((m) => (
                        m.id === messageId ? { ...m, unsent_at: new Date().toISOString(), body: null } : m
                    )))
                    refreshContacts() // the list's last-message preview
                }, () => {
                    setUnsendingId(null)
                    showOutputModal("Failed to unsend the message.", "e")
                })
            }
        )
    }

    const scrollToMessage = (id) => {
        const el = messageRefs.current[id]
        const list = listRef.current
        if (!el || !list) return
        list.scrollTo({ top: el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2, behavior: "smooth" })
        el.classList.add("chat-bubble-highlight")
        setTimeout(() => el.classList.remove("chat-bubble-highlight"), 1200)
    }

    const lastMineIndex = [...messages].map((m) => m.sender_id).lastIndexOf(user.id)
    const totalUnread = contacts.reduce((n, c) => n + (c.unread_count || 0), 0)

    const contactTimestamp = (at) => {
        if (!at) return ''
        return toDate(at).toDateString() === new Date().toDateString() ? readableTime(at) : readableDate(at)
    }

    // Presence (Echo channel) is the live signal; last_seen is the fallback.
    const isOnline = (c) => isUserOnline(c.id) || checkActiveStatus(c.last_seen)
    const statusLabel = (c) => isOnline(c) ? 'Active now' : (c.last_seen ? `Last seen ${readableActiveDuration(c.last_seen)}` : 'Offline')

    // The chat card fills exactly the space left on screen (below the page
    // header, above the phone's bottom navigation) so the page itself never
    // scrolls — only the conversation list and the messages do. Measured, not
    // a fixed calc(), since the header and paddings differ between layouts.
    useLayoutEffect(() => {
        const fit = () => {
            const el = cardRef.current
            if (!el) return
            const nav = document.querySelector('[data-bottom-nav]')
            const navH = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().height : 0
            const top = el.getBoundingClientRect().top + window.scrollY
            // Phones: clear of the bottom navigation's raised centre button too.
            const gap = window.innerWidth >= 768 ? 24 : 24
            let height = Math.max(360, window.innerHeight - top - navH - gap)
            el.style.height = `${height}px`
            // Anything else on the page still pushing it past the screen: take that off too.
            const extra = document.scrollingElement.scrollHeight - window.innerHeight
            if (extra > 0) el.style.height = `${Math.max(360, height - extra)}px`
        }
        fit()
        const raf = requestAnimationFrame(fit)
        window.addEventListener('resize', fit)
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', fit) }
    }, [])

    const list = searchResults ?? contacts
    const avatarOf = (c) => getProfilePic(c?.profile?.profile_picture, c?.profile?.sex)
    // Hover-only actions on a mouse; always shown on touch screens.
    const hoverReveal = isTouchDevice ? {} : { opacity: 0, transition: "opacity .15s", ".chat-row:hover &, &:focus-visible": { opacity: 1 } }

    return (
        <>
            <Head title={active ? `Chat · ${fullName(active)}` : "Chat"} />

            {/* Edit history of a message */}
            <Dialog open={historyMessageId != null} onClose={() => setHistoryMessageId(null)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "1rem", fontWeight: 600, pr: 6 }}>
                    <History size={17} /> Edit History
                    <IconButton aria-label="Close" onClick={() => setHistoryMessageId(null)} sx={{ position: "absolute", right: 10, top: 10 }} size="small"><X size={18} /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {historyData == null
                        ? <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>Loading...</Typography>
                        : <Stack sx={{ gap: 2 }}>
                            {historyData.previous && (
                                <Box>
                                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 0.5 }}>
                                        Before the edit · {readableDate(historyData.previous.created_at)} {readableTime(historyData.previous.created_at)}
                                    </Typography>
                                    <Paper variant="outlined" sx={{ px: 1.5, py: 1, borderRadius: 2, fontSize: "0.875rem", bgcolor: "action.hover" }}>{historyData.previous.body}</Paper>
                                </Box>
                            )}
                            <Box>
                                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 0.5 }}>Now</Typography>
                                <Paper variant="outlined" sx={{ px: 1.5, py: 1, borderRadius: 2, fontSize: "0.875rem", borderColor: "primary.main" }}>
                                    {historyData.current ?? 'This message was unsent'}
                                </Paper>
                            </Box>
                          </Stack>}
                </DialogContent>
            </Dialog>

            {/* mb: cancels the layout's phone bottom padding (pb-40, room for
                scrolling pages); this page sizes itself to the screen instead. */}
            <Box sx={{ width: "100%", pt: { xs: 1.5, md: 3 }, mb: { xs: "-10rem", md: 0 } }}>
                {/* Fills the screen; below md the bottom nav bar (64px) is on screen too. */}
                <Paper
                    ref={cardRef}
                    variant="outlined"
                    sx={{
                        width: "100%", borderRadius: 3, overflow: "hidden",
                        // Real height set by the effect above (fills the screen).
                        height: { xs: "calc(100dvh - 9.75rem)", md: "calc(100dvh - 7.5rem)" },
                        display: "grid", gridTemplateColumns: { xs: "1fr", md: "18rem 1fr", lg: "21rem 1fr" },
                    }}
                >
                    {/* ---------------- Conversations ----------------
                        Phones/tablets: the list until one is picked, then just
                        the conversation; md+ side by side. */}
                    <Box component="aside" sx={[
                        { minHeight: 0, flexDirection: "column", display: { xs: active ? "none" : "flex", md: "flex" } },
                        // The divider beside the conversation (md+), colour included in the breakpoint.
                        (t) => ({ [t.breakpoints.up("md")]: { borderRight: `1px solid ${t.palette.divider}` } }),
                    ]}>
                        <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
                            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                                <Typography component="h1" sx={{ fontSize: "1.15rem", fontWeight: 700 }}>Messages</Typography>
                                {totalUnread > 0 && <Chip size="small" color="primary" variant="outlined" label={`${totalUnread} unread`} sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }} />}
                            </Stack>
                            {canSearch && (
                                <Paper variant="outlined" sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.25, borderRadius: 2, bgcolor: "action.hover", "&:focus-within": { borderColor: "primary.main", bgcolor: "background.paper" } }}>
                                    <Search size={15} style={{ opacity: 0.55, flexShrink: 0 }} />
                                    <InputBase
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search people…"
                                        inputProps={{ "aria-label": "Search people" }}
                                        sx={{ flex: 1, fontSize: "0.85rem", py: 0.5 }}
                                    />
                                    {search && <IconButton size="small" aria-label="Clear search" onClick={() => setSearch("")}><X size={14} /></IconButton>}
                                </Paper>
                            )}
                        </Box>

                        <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 1 }}>
                            {searchResults !== null && (
                                <Typography sx={{ px: 1.5, pb: 0.5, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>Results</Typography>
                            )}
                            {list.length === 0
                                ? <Typography sx={{ px: 2, py: 5, textAlign: "center", fontSize: "0.85rem", color: "text.secondary" }}>
                                    {searchResults !== null ? 'No one found.' : 'No conversations yet.'}
                                  </Typography>
                                : <List disablePadding>
                                    {list.map((c) => {
                                        const unread = c.unread_count > 0
                                        return (
                                            <ListItemButton
                                                key={c.id}
                                                selected={activeId === c.id}
                                                onClick={() => openContact(c)}
                                                sx={{ borderRadius: 2, my: 0.25, px: 1.25, py: 1.1, gap: 1.5, "&.Mui-selected": { bgcolor: "action.selected" } }}
                                            >
                                                <ProfilePic src={avatarOf(c)} size={2.6} showActive={true} isActive={isOnline(c)} activeSize={0.7} />
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Stack direction="row" sx={{ alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
                                                        <Typography noWrap sx={{ fontSize: "0.87rem", fontWeight: unread ? 700 : 600 }}>{fullName(c)}</Typography>
                                                        {c.last_message_at && (
                                                            <Typography sx={{ flexShrink: 0, fontSize: "0.68rem", fontWeight: unread ? 600 : 400, color: unread ? "primary.main" : "text.secondary" }}>
                                                                {contactTimestamp(c.last_message_at)}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mt: 0.25 }}>
                                                        <Typography noWrap sx={{ fontSize: "0.76rem", fontWeight: unread ? 600 : 400, color: unread ? "text.primary" : "text.secondary" }}>
                                                            {c.last_message ?? showUserType(c)}
                                                        </Typography>
                                                        {unread && <Badge badgeContent={c.unread_count > 9 ? '9+' : c.unread_count} color="primary" sx={{ mr: 1.25, "& .MuiBadge-badge": { fontSize: "0.62rem", fontWeight: 700, position: "static", transform: "none" } }} />}
                                                    </Stack>
                                                </Box>
                                            </ListItemButton>
                                        )
                                    })}
                                  </List>}
                        </Box>
                    </Box>

                    {/* ---------------- Conversation ---------------- */}
                    <Box component="section" sx={{ minHeight: 0, height: "100%", flexDirection: "column", display: { xs: active ? "flex" : "none", md: "flex" } }}>
                        {active
                        ? <>
                            <Stack component="header" direction="row" sx={{ alignItems: "center", gap: 1.5, px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
                                <IconButton onClick={closeContact} aria-label="Back to conversations" size="small" sx={{ display: { md: "none" }, ml: -0.5 }}>
                                    <ArrowLeft size={18} />
                                </IconButton>
                                <ProfilePic src={avatarOf(active)} size={2.4} showActive={true} isActive={isOnline(active)} activeSize={0.65} />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography noWrap sx={{ fontSize: "0.95rem", fontWeight: 600 }}>{fullName(active)}</Typography>
                                    <Typography noWrap sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                                        <Box component="span" sx={isOnline(active) ? { color: "success.main", fontWeight: 500 } : undefined}>{statusLabel(active)}</Box>
                                        {' · '}{showUserType(active)}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Box ref={listRef} sx={{ position: "relative", flex: 1, overflowY: "auto", px: { xs: 1.5, sm: 2.5 }, py: 2, bgcolor: "action.hover" }}>
                                {loadingThread && messages.length === 0 && (
                                    <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}><CircularProgress size={26} /></Box>
                                )}
                                {!loadingThread && messages.length === 0 && (
                                    <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
                                        <Box sx={{ textAlign: "center", maxWidth: 280 }}>
                                            <Box sx={{ display: "flex", justifyContent: "center" }}><ProfilePic src={avatarOf(active)} size={4} /></Box>
                                            <Typography sx={{ mt: 1.5, fontWeight: 600 }}>{fullName(active)}</Typography>
                                            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{showUserType(active)}</Typography>
                                            <Typography sx={{ mt: 1.5, fontSize: "0.82rem", color: "text.secondary" }}>No messages yet. Say hello to start the conversation.</Typography>
                                        </Box>
                                    </Box>
                                )}
                                {messages.map((m, i) => {
                                    const mine = m.sender_id === user.id
                                    const prev = messages[i - 1]
                                    const next = messages[i + 1]
                                    const newDay = !prev || !sameDay(prev.created_at, m.created_at)
                                    // First / last of a run of messages from the same person.
                                    const startsGroup = newDay || prev.sender_id !== m.sender_id || toDate(m.created_at) - toDate(prev.created_at) > GROUP_MS
                                    const endsGroup = !next || next.sender_id !== m.sender_id || !sameDay(m.created_at, next.created_at) || toDate(next.created_at) - toDate(m.created_at) > GROUP_MS
                                    const radius = mine
                                        ? { borderRadius: "18px", borderTopRightRadius: startsGroup ? "18px" : "6px", borderBottomRightRadius: "6px" }
                                        : { borderRadius: "18px", borderTopLeftRadius: startsGroup ? "18px" : "6px", borderBottomLeftRadius: "6px" }
                                    const bubble = m.unsent_at
                                        ? { bgcolor: "action.hover", border: 1, borderColor: "divider", color: "text.secondary", fontStyle: "italic" }
                                        : mine
                                            ? { bgcolor: "primary.main", color: "primary.contrastText" }
                                            : { bgcolor: "background.paper", border: 1, borderColor: "divider", color: "text.primary" }
                                    return (
                                        <Box key={m.id}>
                                            {newDay && (
                                                <Divider sx={{ my: 2, "&::before, &::after": { borderColor: "divider" } }}>
                                                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>{dayLabel(m.created_at)}</Typography>
                                                </Divider>
                                            )}
                                            <Stack
                                                direction="row"
                                                className="chat-row"
                                                ref={(el) => { messageRefs.current[m.id] = el }}
                                                sx={{ alignItems: "flex-end", gap: 1, justifyContent: mine ? "flex-end" : "flex-start", mt: startsGroup ? 1.5 : 0.25, borderRadius: 4, transition: "box-shadow .2s", "&.chat-bubble-highlight": { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}` } }}
                                            >
                                                {/* their avatar on the last message of a run */}
                                                {!mine && <Box sx={{ width: 28, flexShrink: 0 }}>{endsGroup && <ProfilePic src={avatarOf(active)} size={1.75} />}</Box>}

                                                {mine && !m.unsent_at && (
                                                    <Stack direction="row" sx={{ alignSelf: "center", flexShrink: 0, ...hoverReveal }}>
                                                        <Tooltip title="Reply" disableInteractive><IconButton size="small" aria-label="Reply" onClick={() => startReply(m)}><Reply size={15} /></IconButton></Tooltip>
                                                        <Tooltip title="More" disableInteractive><IconButton size="small" aria-label="More actions" onClick={(e) => setActionMenu({ anchorEl: e.currentTarget, message: m })}><MoreHorizontal size={16} /></IconButton></Tooltip>
                                                    </Stack>
                                                )}

                                                <Box sx={{ maxWidth: { xs: "78%", sm: "65%" }, px: 1.75, py: 1, fontSize: "0.86rem", lineHeight: 1.55, ...radius, ...bubble, ...(unsendingId === m.id && { opacity: 0.55 }) }}>
                                                    {m.reply_to && !m.unsent_at && (
                                                        <Box
                                                            component="button"
                                                            type="button"
                                                            onClick={() => scrollToMessage(m.reply_to.id)}
                                                            sx={{ display: "block", width: "100%", textAlign: "left", mb: 0.75, px: 1.25, py: 0.75, borderRadius: 1.5, borderLeft: 3, cursor: "pointer", font: "inherit", fontSize: "0.85em", color: "inherit",
                                                                ...(mine ? { bgcolor: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.65)" } : { bgcolor: "action.hover", borderColor: "text.disabled" }) }}
                                                        >
                                                            <Box sx={{ fontWeight: 600 }}>{m.reply_to.sender_id === user.id ? 'You' : toTitleCase(m.reply_to.sender?.profile?.first_name ?? '')}</Box>
                                                            <Box sx={{ opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                {m.reply_to.unsent_at ? 'Original message was unsent' : m.reply_to.body}
                                                            </Box>
                                                        </Box>
                                                    )}
                                                    <Box sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.unsent_at ? 'This message was unsent' : m.body}</Box>
                                                    {unsendingId === m.id && (
                                                        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "flex-end", gap: 0.75, mt: 0.25, fontSize: "0.68rem" }}>
                                                            <CircularProgress size={12} color="inherit" thickness={5} aria-label="Unsending" />
                                                        </Stack>
                                                    )}
                                                    {unsendingId !== m.id && (endsGroup || m.edited_at) && (
                                                        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "flex-end", gap: 0.75, mt: 0.25, fontSize: "0.68rem", opacity: 0.75 }}>
                                                            {m.edited_at && !m.unsent_at && (
                                                                <Box component="button" type="button" onClick={() => openHistory(m.encrypted_id)} title="See edit history"
                                                                    sx={{ font: "inherit", color: "inherit", background: "none", border: 0, p: 0, cursor: "pointer", textDecoration: "underline dotted" }}>
                                                                    Edited
                                                                </Box>
                                                            )}
                                                            {endsGroup && <span>{readableTime(m.created_at)}</span>}
                                                        </Stack>
                                                    )}
                                                </Box>

                                                {!mine && !m.unsent_at && (
                                                    <Tooltip title="Reply" disableInteractive>
                                                        <IconButton size="small" aria-label="Reply" onClick={() => startReply(m)} sx={{ alignSelf: "center", flexShrink: 0, ...hoverReveal }}><Reply size={15} /></IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                            {i === lastMineIndex && (
                                                <Stack direction="row" sx={{ justifyContent: "flex-end", alignItems: "center", gap: 0.5, mt: 0.5, pr: 0.5, fontSize: "0.68rem", color: "text.secondary" }}>
                                                    {m.read_at
                                                        ? <><CheckCheck size={13} color="#3b82f6" /> Seen {readableTime(m.read_at)}</>
                                                        : <><Check size={13} /> Sent</>}
                                                </Stack>
                                            )}
                                        </Box>
                                    )
                                })}
                                <div ref={bottomRef} />
                            </Box>

                            <Menu
                                anchorEl={actionMenu?.anchorEl}
                                open={!!actionMenu}
                                onClose={() => setActionMenu(null)}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                            >
                                {actionMenu?.message.sender_id === user.id && canStillEdit(actionMenu.message) && (
                                    <MenuItem onClick={() => { setActionMenu(null); startEdit(actionMenu.message) }}>
                                        <ListItemIcon><Pencil size={16} /></ListItemIcon>
                                        <ListItemText>Edit</ListItemText>
                                    </MenuItem>
                                )}
                                {actionMenu?.message.sender_id === user.id && (
                                    <MenuItem onClick={() => { setActionMenu(null); handleUnsend(actionMenu.message.id) }} sx={{ color: 'error.main' }}>
                                        <ListItemIcon sx={{ color: 'inherit' }}><Trash2 size={16} /></ListItemIcon>
                                        <ListItemText>Unsend</ListItemText>
                                    </MenuItem>
                                )}
                            </Menu>

                            {/* Composer: what you're replying to / editing, then the box */}
                            <Box sx={{ borderTop: 1, borderColor: "divider", px: { xs: 1.5, sm: 2 }, pt: 1.25, pb: 1.5 }}>
                                {editingMessage && (
                                    <Alert severity="warning" icon={<Pencil size={15} />} sx={{ mb: 1, py: 0.25, borderRadius: 2, "& .MuiAlert-message": { minWidth: 0 } }}
                                        action={<IconButton size="small" aria-label="Cancel editing" onClick={cancelEdit}><X size={15} /></IconButton>}>
                                        <Typography sx={{ fontSize: "0.72rem", fontWeight: 600 }}>Editing your message</Typography>
                                        <Typography noWrap sx={{ fontSize: "0.78rem", opacity: 0.85 }}>{editingMessage.body}</Typography>
                                    </Alert>
                                )}
                                {replyingTo && !editingMessage && (
                                    <Paper variant="outlined" sx={{ mb: 1, px: 1.5, py: 1, borderRadius: 2, display: "flex", alignItems: "flex-start", gap: 1, bgcolor: "action.hover" }}>
                                        <Box sx={{ minWidth: 0, flex: 1, borderLeft: 3, borderColor: "primary.main", pl: 1 }}>
                                            <Typography sx={{ fontSize: "0.72rem", fontWeight: 600 }}>
                                                Replying to {replyingTo.sender_id === user.id ? 'yourself' : toTitleCase(active.profile?.first_name ?? '')}
                                            </Typography>
                                            <Typography noWrap sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{replyingTo.body}</Typography>
                                        </Box>
                                        <IconButton size="small" aria-label="Cancel reply" onClick={() => setReplyingTo(null)}><X size={15} /></IconButton>
                                    </Paper>
                                )}
                                <Paper
                                    component="form"
                                    onSubmit={handleSend}
                                    variant="outlined"
                                    sx={{ display: "flex", alignItems: "flex-end", gap: 1, pl: 2, pr: 0.75, py: 0.75, borderRadius: 3, "&:focus-within": { borderColor: "primary.main", boxShadow: (t) => `0 0 0 1px ${t.palette.primary.main}` } }}
                                >
                                    <InputBase
                                        inputRef={textareaRef}
                                        multiline
                                        maxRows={5}
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        inputProps={{ "aria-label": "Message" }}
                                        placeholder="Type a message…"
                                        sx={{
                                            flex: 1, fontSize: "0.88rem", py: 0.75,
                                            // The box's own outline is the focus cue: no second ring/border
                                            // on the textarea itself (the global form styles add one).
                                            "& textarea, & textarea:focus": { outline: "none", boxShadow: "none", border: 0, p: 0, bgcolor: "transparent" },
                                        }}
                                    />
                                    <IconButton
                                        type="submit"
                                        color="primary"
                                        disabled={sending || !body.trim()}
                                        aria-label={editingMessage ? "Save edit" : "Send"}
                                        sx={{ width: 38, height: 38, bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" }, "&.Mui-disabled": { bgcolor: "action.disabledBackground" } }}
                                    >
                                        {editingMessage ? <Check size={17} /> : <Send size={16} />}
                                    </IconButton>
                                </Paper>
                                {/* The keyboard hint, under the box (it no longer crowds the placeholder). */}
                                {!isTouchDevice && isWide && (
                                    <Typography sx={{ mt: 0.5, pl: 2, fontSize: "0.68rem", color: "text.secondary" }}>
                                        Enter to send · Shift+Enter for a new line
                                    </Typography>
                                )}
                            </Box>
                        </>
                        : <Box sx={{ flex: 1, display: "grid", placeItems: "center", bgcolor: "action.hover" }}>
                            <Box sx={{ textAlign: "center", px: 3 }}>
                                <Avatar sx={{ width: 64, height: 64, mx: "auto", bgcolor: "primary.main", color: "primary.contrastText" }}><MessagesSquare size={28} /></Avatar>
                                <Typography sx={{ mt: 1.5, fontWeight: 600 }}>Your messages</Typography>
                                <Typography sx={{ mt: 0.5, fontSize: "0.85rem", color: "text.secondary" }}>
                                    Pick a conversation from the list{canSearch ? ', or search for someone,' : ''} to start chatting.
                                </Typography>
                            </Box>
                          </Box>}
                    </Box>
                </Paper>
            </Box>
        </>
    )
}

Chat.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default Chat
