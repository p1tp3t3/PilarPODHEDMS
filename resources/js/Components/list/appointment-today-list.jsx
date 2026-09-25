import { getProfilePic, readableDate, readableTime, showUserType } from "@/others/function"
import ProfilePic from "../other/profile-pic"
import ListSkeleton from "../reload/list-skeleton"
import { AlertCircle, Clock } from "lucide-react"

const AppointmentTodayList = ({ list = null }) => {

    return (
        <div className="w-full h-[22rem]">
            <div className="w-full flex justify-between items-center px-5 py-2">
                <b>Upcoming Scheduled Appointments</b>
            </div>
            <div className="overflow-hidden overflow-y-auto h-[19rem] w-full flex flex-col px-5">
                {(list != null)
                ?
                (list.length != 0)
                ?
                list.map((e, i) => <Row data={e} />)
                :
                <div className="text-[1em] text-gray-500 w-full grid place-items-center h-full">
                    <div className="grid place-items-center">
                        <div className="text-[4em]">
                            <AlertCircle size="1em" />
                        </div>
                        <div>No Upcoming Appointments</div>
                    </div>
                </div>
                :
                <div className="text-[1em] text-gray-500 w-full grid place-items-center h-full">
                    <ListSkeleton rows={4} />
                </div>}
            </div>
        </div>
    )
}

const Row = ({ data }) => {
    return (
        <div className="border-b border-gray-200 py-3 px-2 hover:bg-gray-50 transition">

            <div className="flex w-full justify-between items-center">

                {/* Left: Profile + Name */}
                <div className="flex items-center gap-3">
                    <ProfilePic
                        size={2.5}
                        src={getProfilePic(data.user.profile?.profile_picture, data.user.profile?.sex)}
                    />

                    <div className="leading-tight">
                        <div className="text-[0.9em] font-semibold text-gray-800">
                            {data.user.profile?.first_name}{" "}
                            {data.user.profile?.middle_name && `${data.user.profile.middle_name} `}
                            {data.user.profile?.last_name}
                        </div>
                        <div className="text-[0.7em] text-gray-500">
                            {showUserType(data.user)}
                        </div>
                    </div>
                </div>

                {/* Right: Date + Time */}
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[0.7em] text-gray-500">{readableDate(data.date_time_appoint)}</span>
                    <span className="text-[0.75em] bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200 shadow-sm flex items-center gap-1">
                        <Clock size={12} className="text-blue-700" />
                        {readableTime(data.date_time_appoint)}
                    </span>
                </div>
            </div>
        </div>
    );
};


export default AppointmentTodayList