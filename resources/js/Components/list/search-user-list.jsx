import ProfilePic from "../other/profile-pic"
import { Link } from "@inertiajs/react"
import ListSkeleton from "../reload/list-skeleton"
import { getProfilePic, showUserType } from "@/others/function"
import { Search } from "lucide-react"

const UserProfileList = (props) => {
    return (
        <div className="absolute w-full bg-white shadow-md shadow-black/20 px-3 py-3 z-10">
            <div className="w-full">
                {(props.list != null)
                ?
                ((props.list.length != 0)
                 ?
                  props.list.map((e, i) =>
                        <div className="w-full" key={i}>
                            <Row
                                src={getProfilePic(e.profile?.profile_picture, e.profile?.sex)}
                                name={`${e.profile?.first_name || ""} ${e.profile?.last_name || ""}`}
                                subtitle={showUserType(e)}
                                id={e.id}
                                authType={props.authType}
                                withLink={props.withLink}
                                link={(props.param) ? `${props.link}?search=${e.id_number}` : null}
                                event={() => props.event(e[props.type], e)}
                            />
                        </div>
                    )
                  :<div className="w-full text-[0.9em] text-center py-3 text-gray-600">
                       <b><Search size={14} /> {(props.default) ? props.default : "User Not Found"}</b>
                   </div>)
                :
                <div className="flex justify-center items-center w-full">
                    <ListSkeleton rows={3} />
                </div>}
            </div>
        </div>
    )
}
const Row = (props) => {
    return (
        <>
        {(props.withLink)
        ?
        <Link href={(props.link != null) ? props.link : `/profile/id/${props.id}`}>
            <div className="flex px-2 py-1 items-center gap-2 hover:bg-gray-200 rounded-lg">
                <div>
                    <ProfilePic
                        activeBorderColor='border-white border-[3px]'
                        src={props.src}
                        size={1.9}
                    />
                </div>
                <div className="text-[0.7em]">
                    <h1 className="text-[1.2em]"><b>{props.name}</b></h1>
                    <p className="text-gray-500">{props.subtitle}</p>
                </div>
            </div>
        </Link>
        :
        <div
            className="flex px-2 py-1 items-center gap-2 hover:bg-gray-200 rounded-lg cursor-pointer"
            onClick={props.event}
        >
            <div>
                <ProfilePic
                    activeBorderColor='border-white border-[3px]'
                    src={props.src}
                    size={1.9}
                />
            </div>
            <div className="text-[0.8em]">
                <h1 className="text-[1.2em]"><b>{props.name}</b></h1>
                <p className="text-[0.85em] text-gray-500">{props.subtitle}</p>
            </div>
        </div>}
        </>
    )
}
export default UserProfileList