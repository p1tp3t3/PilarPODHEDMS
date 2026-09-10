import { readableDate, readableTime, parseNotifContent } from "@/others/function"
import NotificationWrapper from "@/wrapper/notif-wrapper"
import { Phone } from "lucide-react"

const CallInNotif = ({ obj }) => {
    const date = readableDate(obj.created_at),
          time = readableTime(obj.created_at),
          content = parseNotifContent(obj.content),
          isProgramHead = content.is_program_head != undefined ? content.is_program_head : false
          
    return (
        <>
        <div className="h-[3rem] w-[3rem] flex-shrink-0 grid place-items-center rounded-full bg-blue-300/20 text-blue-600">
            <Phone />
        </div>
        <div className="grid gap-2">
            <div className="flex gap-2 items-center">
                <div className="w-full flex flex-col gap-1">
                    <p className={`text-[0.8em] ${(obj.read_since == null) ? 'font-[600]' : 'text-gray-600'}`}>{isProgramHead ? 'Your Student Has Been Called In By The Office of the Prefect' : 'You Have Been Called in By the Prefect'}</p>
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
export default CallInNotif