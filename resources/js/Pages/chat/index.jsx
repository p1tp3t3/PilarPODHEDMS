import AuthLayout from "@/Layouts/auth-layout"
import { useState, useEffect, useRef } from "react"
import { Head } from "@inertiajs/react"
import ProfilePic from "@/Components/other/profile-pic"
import { getProfilePic, readableDate, readableTime, toTitleCase, showWarningModal } from "@/others/function"
import { ChatService } from "@/others/services/chat-service"
import { UserService } from "@/others/services/user-service"
import { Broadcast } from "@/others/classes/broadcast-cofiguration"
import { Send, MessageCircle, Reply, X, Check, CheckCheck, Trash2, Pencil, History, ArrowLeft, MoreVertical, Search } from "lucide-react"
import { Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material"

// Only admins (prefect/itrc) can message any user — canChat() on the
// backend treats sub_admin/super_admin identically as the "hub" in a
// hub-and-spoke model, so only they get a broad search; everyone else's
// contacts are always just the admin(s), already fully listed.
const isAdminRole = (role) => role === 'sub_admin' || role === 'super_admin'

const Chat = ({ user, contacts: initialContacts }) => {
    const [contacts, setContacts] = useState(initialContacts || [])
    const [activeId, setActiveId] = useState(null)
    const [search, setSearch] = useState("")
    const [searchResults, setSearchResults] = useState(null)
    const canSearch = isAdminRole(user.role)
    const [messages, setMessages] = useState([])
    const [body, setBody] = useState("")
    const [sending, setSending] = useState(false)
    const [replyingTo, setReplyingTo] = useState(null)
    const [editingMessage, setEditingMessage] = useState(null)
    const [historyMessageId, setHistoryMessageId] = useState(null)
    const [historyData, setHistoryData] = useState(null)
    // Anchored actions menu — replaces hover-to-reveal (no hover on touch
    // devices) with an always-visible button that opens a menu next to it.
    const [actionMenu, setActionMenu] = useState(null) // { anchorEl, message } | null
    const bottomRef = useRef(null)
    const activeIdRef = useRef(activeId)
    const messageRefs = useRef({})
    const textareaRef = useRef(null)
    const isTouchDevice = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

    useEffect(() => { activeIdRef.current = activeId }, [activeId])

    useEffect(() => {
        if (activeId == null) return
        setReplyingTo(null)
        setEditingMessage(null)
        setBody("")
        ChatService.getThread(activeId, (d) => setMessages(d.messages || []))
    }, [activeId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    useEffect(() => {
        new Broadcast(
            'private',
            'chat.' + user.id,
            'MessageSent',
            (e) => {
                const msg = e.message

                if (msg.sender_id === activeIdRef.current) {
                    setMessages((prev) => [...prev, msg])
                    ChatService.getThread(activeIdRef.current, () => {})
                }

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
            }
        ).configure('enable chat edit')
    }, [])

    // Search: check existing contacts (already-messaged users) first, with
    // no API call at all — only fall back to the backend search when
    // nothing local matches, and that call itself is cached in
    // localStorage (UserService.search) so re-typing the same query never
    // sends a repeat request.
    useEffect(() => {
        if (!canSearch) return

        const q = search.trim().toLowerCase()
        if (q === '') {
            setSearchResults(null)
            return
        }

        const localMatches = contacts.filter((c) => {
            const name = `${c.profile?.first_name ?? ''} ${c.profile?.last_name ?? ''}`.toLowerCase()
            return name.includes(q) || c.id_number?.toLowerCase().includes(q)
        })

        if (localMatches.length > 0) {
            setSearchResults(localMatches)
            return
        }

        const timeout = setTimeout(() => {
            UserService.search('/api/all-users/all-2', search, (data) => {
                setSearchResults(Array.isArray(data) ? data : [])
            })
        }, 500)

        return () => clearTimeout(timeout)
    }, [search, contacts, canSearch])

    const active = contacts.find((c) => c.id === activeId)

    // `stub` is the raw user object from a search result — used only the
    // first time someone not yet in `contacts` (found via search, not an
    // existing conversation) is opened, so they appear in the list and a
    // thread can start with them.
    const openContact = (id, stub) => {
        setActiveId(id)
        setContacts((prev) => {
            if (prev.some((c) => c.id === id)) {
                return prev.map((c) => c.id === id ? { ...c, unread_count: 0 } : c)
            }
            if (!stub) return prev
            return [{ ...stub, unread_count: 0, last_message: null, last_message_at: null }, ...prev]
        })
        setSearch("")
        setSearchResults(null)
    }

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
            }, () => setSending(false))
            return
        }

        const sentTo = activeId
        const replyId = replyingTo?.id ?? null
        setSending(true)
        ChatService.send(sentTo, text, replyId, () => {
            setSending(false)
            setBody("")
            setReplyingTo(null)
            ChatService.getThread(sentTo, (d) => setMessages(d.messages || []))
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
                ChatService.unsend(messageId, () => {
                    setMessages((prev) => prev.map((m) => (
                        m.id === messageId ? { ...m, unsent_at: new Date().toISOString(), body: null } : m
                    )))
                }, () => {})
            }
        )
    }

    const scrollToMessage = (id) => {
        const el = messageRefs.current[id]
        if (!el) return
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.classList.add("chat-bubble-highlight")
        setTimeout(() => el.classList.remove("chat-bubble-highlight"), 1200)
    }

    const lastMineIndex = [...messages].map((m) => m.sender_id).lastIndexOf(user.id)

    const contactTimestamp = (at) => {
        if (!at) return ''
        const d = new Date(at.replace(' ', 'T'))
        const now = new Date()
        const isToday = d.toDateString() === now.toDateString()
        return isToday ? readableTime(at) : readableDate(at)
    }

    return (
        <>
            <Head title="Chat" />
            <style>{`
                .chat-bubble-highlight { box-shadow: 0 0 0 2px #3b82f6; }
            `}</style>
            {historyMessageId != null && (
                <div className="fixed inset-0 z-[200] bg-black/40 grid place-items-center px-4" onClick={() => setHistoryMessageId(null)}>
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="font-semibold text-[0.95em]">Edit History</h2>
                            <button type="button" onClick={() => setHistoryMessageId(null)} className="text-gray-400 hover:text-gray-700">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-3">
                            {historyData == null
                            ? <div className="text-sm text-gray-500">Loading...</div>
                            : <>
                                {historyData.previous && (
                                    <div className="text-sm">
                                        <div className="text-[0.7em] text-gray-400 mb-0.5">
                                            Previous — {readableDate(historyData.previous.created_at)} {readableTime(historyData.previous.created_at)}
                                        </div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-gray-600">{historyData.previous.body}</div>
                                    </div>
                                )}
                                <div className="text-sm">
                                    <div className="text-[0.7em] text-gray-400 mb-0.5">Current</div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-gray-800">
                                        {historyData.current ?? 'This message was unsent'}
                                    </div>
                                </div>
                              </>}
                        </div>
                    </div>
                </div>
            )}
            <div className="w-full py-6">
                <div className="w-full bg-white rounded-md shadow-black/20 shadow-sm overflow-hidden" style={{ height: '75vh' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-[18rem_1fr] h-full">
                        {/* Mobile: contact list and the active thread are two
                            separate full-screen views (list until a contact
                            is picked, then just the thread) — on sm+ both
                            columns show side by side as normal. */}
                        <div className={`border-r border-gray-200 overflow-y-auto ${active ? 'hidden sm:block' : ''}`}>
                            <div className="px-4 py-3 border-b border-gray-200">
                                <h1 className="text-[1.1em] font-bold">Chat</h1>
                            </div>
                            {canSearch && (
                                <div className="px-3 py-2 border-b border-gray-200 relative">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search anyone..."
                                            className="w-full border border-gray-300 rounded-full pl-8 pr-3 py-1.5 text-[0.8em] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                            {(searchResults ?? contacts).length === 0
                            ? <div className="p-4 text-sm text-gray-500">
                                {searchResults !== null ? 'No users found.' : 'No contacts available.'}
                              </div>
                            : (searchResults ?? contacts).map((c) => {
                                const unread = c.unread_count > 0
                                return (
                                <button
                                    key={c.id}
                                    onClick={() => openContact(c.id, c)}
                                    className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-gray-100 hover:bg-gray-50 ${activeId === c.id ? 'bg-blue-50' : ''}`}
                                >
                                    <ProfilePic src={getProfilePic(c.profile?.profile_picture, c.profile?.sex)} size={2.5} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className={`text-[0.85em] truncate ${unread ? 'font-bold text-gray-900' : 'font-semibold'}`}>
                                                {`${c.profile?.first_name ?? ''} ${c.profile?.last_name ?? ''}`}
                                            </div>
                                            {c.last_message_at && (
                                                <div className={`shrink-0 text-[0.7em] ${unread ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
                                                    {contactTimestamp(c.last_message_at)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-[0.7em] text-gray-500">{toTitleCase(c.role)}</div>
                                            {unread && (
                                                <span className="shrink-0 bg-red-600 text-white text-[0.65em] font-bold rounded-full w-5 h-5 grid place-items-center">
                                                    {c.unread_count > 9 ? '9+' : c.unread_count}
                                                </span>
                                            )}
                                        </div>
                                        {c.last_message && (
                                            <div className={`text-[0.75em] truncate mt-0.5 ${unread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                                {c.last_message}
                                            </div>
                                        )}
                                    </div>
                                </button>
                                )
                            })}
                        </div>

                        <div className={`flex-col h-full min-h-0 ${active ? 'flex' : 'hidden sm:flex'}`}>
                            {active
                            ? <>
                                <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setActiveId(null)}
                                        className="sm:hidden text-gray-500 hover:text-gray-800 shrink-0"
                                        title="Back to contacts"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <ProfilePic src={getProfilePic(active.profile?.profile_picture, active.profile?.sex)} size={2.2} />
                                    <div>
                                        <div className="text-[0.9em] font-semibold">
                                            {`${active.profile?.first_name ?? ''} ${active.profile?.last_name ?? ''}`}
                                        </div>
                                        <div className="text-[0.7em] text-gray-500">{toTitleCase(active.role)}</div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                                    {messages.map((m, i) => {
                                        const mine = m.sender_id === user.id
                                        return (
                                            <div
                                                key={m.id}
                                                ref={(el) => { messageRefs.current[m.id] = el }}
                                                className={`chat-bubble-row flex items-center gap-2 transition-shadow rounded-2xl ${mine ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {mine && !m.unsent_at && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            className="text-gray-400 hover:text-gray-700"
                                                            onClick={() => { setEditingMessage(null); setReplyingTo(m) }}
                                                            title="Reply"
                                                        >
                                                            <Reply size={15} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="text-gray-400 hover:text-gray-700"
                                                            onClick={(e) => setActionMenu({ anchorEl: e.currentTarget, message: m })}
                                                            title="More actions"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                                <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-[0.85em] ${m.unsent_at ? 'bg-gray-100 border border-gray-200 text-gray-400 italic' : mine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                                                    {m.reply_to && !m.unsent_at && (
                                                        <button
                                                            type="button"
                                                            onClick={() => scrollToMessage(m.reply_to.id)}
                                                            className={`block w-full text-left mb-1.5 rounded-lg px-2 py-1 text-[0.85em] border-l-2 ${mine ? 'bg-blue-700/40 border-blue-200' : 'bg-gray-100 border-gray-300'}`}
                                                        >
                                                            <div className={`font-semibold ${mine ? 'text-blue-50' : 'text-gray-600'}`}>
                                                                {m.reply_to.sender_id === user.id ? 'You' : toTitleCase(m.reply_to.sender?.profile?.first_name ?? '')}
                                                            </div>
                                                            <div className={`truncate ${mine ? 'text-blue-100' : 'text-gray-500'}`}>
                                                                {m.reply_to.unsent_at ? 'Original message was unsent' : m.reply_to.body}
                                                            </div>
                                                        </button>
                                                    )}
                                                    <div className="whitespace-pre-wrap break-words">
                                                        {m.unsent_at ? 'This message was unsent' : m.body}
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 text-[0.65em] mt-1 ${m.unsent_at ? 'text-gray-400' : mine ? 'text-blue-100' : 'text-gray-400'}`}>
                                                        <span>{readableDate(m.created_at)} {readableTime(m.created_at)}</span>
                                                        {m.edited_at && !m.unsent_at && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openHistory(m.id)}
                                                                className={`flex items-center gap-0.5 underline decoration-dotted ${mine ? 'text-blue-100 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                                                title="See edit history"
                                                            >
                                                                <History size={11} /> Edited
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {!mine && !m.unsent_at && (
                                                    <button
                                                        type="button"
                                                        className="text-gray-400 hover:text-gray-700 shrink-0"
                                                        onClick={() => { setEditingMessage(null); setReplyingTo(m) }}
                                                        title="Reply"
                                                    >
                                                        <Reply size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                    {lastMineIndex !== -1 && (
                                        <div className="flex justify-end pr-1">
                                            <div className="flex items-center gap-1 text-[0.7em] text-gray-400">
                                                {messages[lastMineIndex].read_at
                                                ? <><CheckCheck size={13} className="text-blue-500" /> Seen {readableDate(messages[lastMineIndex].read_at)} {readableTime(messages[lastMineIndex].read_at)}</>
                                                : <><Check size={13} /> Sent</>}
                                            </div>
                                        </div>
                                    )}
                                    <div ref={bottomRef} />
                                </div>

                                <Menu
                                    anchorEl={actionMenu?.anchorEl}
                                    open={!!actionMenu}
                                    onClose={() => setActionMenu(null)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                                >
                                    {actionMenu?.message.sender_id === user.id && (
                                        <MenuItem onClick={() => { setActionMenu(null); handleUnsend(actionMenu.message.id) }}>
                                            <ListItemIcon><Trash2 size={16} /></ListItemIcon>
                                            <ListItemText>Unsend</ListItemText>
                                        </MenuItem>
                                    )}
                                    {actionMenu?.message.sender_id === user.id && (
                                        <MenuItem onClick={() => { setActionMenu(null); startEdit(actionMenu.message) }}>
                                            <ListItemIcon><Pencil size={16} /></ListItemIcon>
                                            <ListItemText>Edit</ListItemText>
                                        </MenuItem>
                                    )}
                                </Menu>

                                {editingMessage && (
                                    <div className="border-t border-gray-200 px-3 pt-2 flex items-start justify-between gap-2 bg-amber-50">
                                        <div className="border-l-2 border-amber-500 pl-2 min-w-0">
                                            <div className="text-[0.75em] font-semibold text-amber-700">Editing message</div>
                                            <div className="text-[0.75em] text-gray-500 truncate">{editingMessage.body}</div>
                                        </div>
                                        <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-gray-700 shrink-0 mt-0.5">
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}

                                {replyingTo && !editingMessage && (
                                    <div className="border-t border-gray-200 px-3 pt-2 flex items-start justify-between gap-2 bg-gray-50">
                                        <div className="border-l-2 border-blue-500 pl-2 min-w-0">
                                            <div className="text-[0.75em] font-semibold text-gray-600">
                                                Replying to {replyingTo.sender_id === user.id ? 'yourself' : toTitleCase(active.profile?.first_name ?? '')}
                                            </div>
                                            <div className="text-[0.75em] text-gray-500 truncate">{replyingTo.body}</div>
                                        </div>
                                        <button type="button" onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-700 shrink-0 mt-0.5">
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}

                                <form onSubmit={handleSend} className="border-t border-gray-200 p-3 flex items-end gap-2">
                                    <textarea
                                        ref={textareaRef}
                                        rows={1}
                                        value={body}
                                        onChange={(e) => {
                                            setBody(e.target.value)
                                            e.target.style.height = 'auto'
                                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                                        }}
                                        onKeyDown={handleKeyDown}
                                        placeholder={isTouchDevice ? "Type a message..." : "Type a message... (Enter to send, Shift+Enter for new line)"}
                                        className="flex-1 border border-gray-300 rounded-2xl px-4 py-2 text-[0.85em] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-[7.5rem]"
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || !body.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-full w-10 h-10 grid place-items-center shrink-0"
                                    >
                                        <Send size={16} />
                                    </button>
                                </form>
                            </>
                            : <div className="flex-1 grid place-items-center text-gray-400">
                                <div className="text-center">
                                    <MessageCircle size={36} className="mx-auto mb-2" />
                                    <div className="text-sm">Select a contact to start chatting</div>
                                </div>
                            </div>}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

Chat.layout = (page) => <AuthLayout user={page.props.user}>{page}</AuthLayout>

export default Chat
