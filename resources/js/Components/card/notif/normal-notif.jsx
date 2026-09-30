import { readableDate, readableTime, parseNotifContent } from "@/others/function"
import { User } from "lucide-react"

const NormalNotif = ({ obj }) => {
    const content = parseNotifContent(obj.content)

    const date = readableDate(obj.created_at),
          time = readableTime(obj.created_at)

    // A maintenance notice's message is free-form rich text an admin wrote
    // (could be several paragraphs/lists) — showing it raw in this compact
    // preview looks messy and dumps the whole thing before the reader even
    // opens it. The full content still shows on the notification's own
    // detail page; this preview just names what kind of notice it is.
    const previewMessage = obj.notif_type === 'maintenance_notice'
        ? 'A new maintenance notice has been posted. Tap to view.'
        : content.receiver_notif_message

       return (
           <>
           <div className="h-[3rem] w-[3rem] flex-shrink-0 grid place-items-center rounded-full bg-blue-300/20 text-blue-600">
               <User />
           </div>
           <div className="grid gap-2">
               <div className="flex gap-2 items-center">
                   <div className="w-full flex flex-col gap-1">
                       <p
                           className={`text-[0.8em] ${(obj.read_since == null) ? 'font-[600]' : 'text-gray-600'}`}
                           dangerouslySetInnerHTML={{ __html: previewMessage }}
                       />
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
export default NormalNotif