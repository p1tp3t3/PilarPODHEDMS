import { readableDate, readableTime, toTitleCase, parseNotifContent } from "@/others/function"
import { Calendar } from "lucide-react"

const AppointmentNotif = ({ obj }) => {
    const content = parseNotifContent(obj.content)

    const date = readableDate(obj.created_at),
          time = readableTime(obj.created_at)

    return (
        <>
        <div className={`h-[3rem] w-[3rem] flex-shrink-0 grid place-items-center rounded-full bg-gray-200 text-green-500`}>
            <Calendar />
        </div>
        <div className="grid gap-3">
            <div className="flex items-center gap-1">
                <div className="w-full flex flex-col gap-1">
                    <p className={`text-[0.8em] ${(obj.read_since == null) ? 'font-[600]' : 'text-gray-600'}`}>{toTitleCase(content.receiver_notif_message)}</p>
                </div>
                <div className="text-[0.7em] w-[0.8rem] h-[0.8rem] self-center relative">        
                    {(obj.read_since == null) &&
                    <div 
                        className="w-[0.8rem] h-[0.8rem] bg-blue-400 rounded-full right-0"
                    ></div>}
                </div>
            </div>
            <div className={`text-[0.7em] ${(obj.read_since == null) ? 'font-[600]' : 'text-gray-600'}`}>
                {`${date} (${time})`}
            </div>
        </div>
        </>
    )
}
export default AppointmentNotif