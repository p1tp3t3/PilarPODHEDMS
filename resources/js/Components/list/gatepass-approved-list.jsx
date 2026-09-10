import { getProfilePic, readableDate, readableTime, showUserType, toTitleCase } from "@/others/function";
import ProfilePic from "../other/profile-pic";
import ListSkeleton from "../reload/list-skeleton";
import { AlertCircle } from "lucide-react";

const GatePassApprovedList = ({ list = null }) => {
    return (
        <div className="w-full px-5 py-4 bg-white border border-gray-200">

            <div className="w-full grid gap-4">
                {list !== null ? (
                    list.length !== 0 ? (
                        list.map((e, i) => <Row key={i} data={e} />)
                    ) : (
                        <div className="text-gray-500 w-full grid place-items-center py-10">
                            <div className="grid place-items-center text-center">
                                <div className="text-5xl mb-2">
                                    <AlertCircle size="1em" className="text-gray-400" />
                                </div>
                                <div className="font-semibold">No Approved Users Yet</div>
                                <div className="text-sm">Gate pass approvals will appear here.</div>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="w-full grid place-items-center py-10">
                        <ListSkeleton rows={4} />
                    </div>
                )}
            </div>
        </div>
    );
};

const Row = ({ data }) => {
    
    const gp = data.gatepass[0];
    const isAllowTo = JSON.parse(gp.allow_to).length != 2 
                      ? toTitleCase(JSON.parse(gp.allow_to)[0].replace('-', ' '))
                      : toTitleCase(JSON.parse(gp.allow_to)[0].replace('-', ' ') + ' and ' + toTitleCase(JSON.parse(gp.allow_to)[1].replace('-', ' ')));

    return (
        <div className="w-full border-b border-gray-200 py-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">

                {/* LEFT: Profile + Info */}
                <div className="flex gap-4 items-center">
                    <ProfilePic
                        src={getProfilePic(data.profile?.profile_picture, data.profile?.sex)}
                        size={3}
                    />

                    <div className="leading-snug">
                        <div className="text-base font-bold text-gray-800 tracking-wide">
                            {data.profile?.first_name} {data.profile?.last_name}
                        </div>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full mt-1 inline-block font-medium">
                            {showUserType(data)}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                            Gate Pass No. {gp.gatepass_number}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Gate Pass Info */}
                <div className="text-right space-y-1">
                    <div className="text-xs font-semibold text-gray-700">
                        Approved Since:{" "}
                        <span className="text-green-700">
                            {readableDate(gp.confirmed_at)} • {readableTime(gp.confirmed_at)}
                        </span>
                    </div>

                    <div className="text-xs font-semibold text-gray-700">
                        Allowed To:{" "}
                        <span className="text-indigo-700">{isAllowTo + ' The Campus'}</span>
                    </div>

                    <div className="text-xs font-bold text-red-600">
                        Expires At: {readableDate(gp.date_expiration)} {readableTime(gp.date_expiration)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GatePassApprovedList;
