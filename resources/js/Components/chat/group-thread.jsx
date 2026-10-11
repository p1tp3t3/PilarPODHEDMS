import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Send, UsersRound } from "lucide-react"
import ProfilePic from "@/Components/other/profile-pic"
import { getProfilePic, readableDate, readableTime } from "@/others/function"

// Program group chat thread (teaching staff). Messages/members come from the
// chat page, which owns the live Reverb subscription.
const GroupThread = ({ group, messages, members, user, onSend, onBack, isTouchDevice }) => {
    const [body, setBody] = useState("")
    const [sending, setSending] = useState(false)
    const bottomRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const send = (e) => {
        e?.preventDefault()
        const text = body.trim()
        if (!text || sending) return
        // Clear right away; the request waits on the Reverb broadcast. Put the
        // text back if sending fails.
        setSending(true)
        setBody("")
        onSend(text, () => setSending(false), () => {
            setBody(text)
            setSending(false)
        })
    }

    return (
        <>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                <button type="button" onClick={onBack} className="sm:hidden text-gray-500 hover:text-gray-800 shrink-0" title="Back">
                    <ArrowLeft size={18} />
                </button>
                <span className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 grid place-items-center shrink-0">
                    <UsersRound size={18} />
                </span>
                <div className="min-w-0">
                    <div className="text-[0.9em] font-semibold truncate">{group.name}</div>
                    <div className="text-[0.7em] text-gray-500 truncate">
                        {members == null ? "Loading members..." : `${members.length} member${members.length === 1 ? "" : "s"} · ${members.map((m) => m.name).join(", ")}`}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                {messages == null ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                ) : messages.length === 0 ? (
                    <div className="h-full grid place-items-center text-center text-gray-400 text-sm">
                        No messages yet — say hello to your program's faculty.
                    </div>
                ) : (
                    messages.map((m, i) => {
                        const mine = m.sender_id === user.id
                        const showName = !mine && messages[i - 1]?.sender_id !== m.sender_id
                        return (
                            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                                {!mine && (
                                    <div className="w-8 shrink-0">
                                        {showName && <ProfilePic size={2} src={getProfilePic(m.sender_picture, m.sender_sex)} />}
                                    </div>
                                )}
                                <div className="max-w-[70%]">
                                    {showName && <div className="text-[0.7em] text-gray-500 mb-0.5 ml-1">{m.sender_name}</div>}
                                    <div className={`rounded-2xl px-3.5 py-2 text-[0.85em] ${mine ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-800"}`}>
                                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                                        <div className={`text-[0.65em] mt-1 ${mine ? "text-blue-100" : "text-gray-400"}`}>
                                            {readableDate(m.created_at)} {readableTime(m.created_at)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="border-t border-gray-200 p-3 flex items-end gap-2">
                <textarea
                    rows={1}
                    value={body}
                    onChange={(e) => {
                        setBody(e.target.value)
                        e.target.style.height = "auto"
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
                    }}
                    onKeyDown={(e) => {
                        if (e.key !== "Enter" || e.shiftKey || isTouchDevice) return
                        e.preventDefault()
                        send()
                    }}
                    placeholder={`Message ${group.name}...`}
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
    )
}

export default GroupThread
