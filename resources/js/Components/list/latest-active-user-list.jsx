import { checkActiveStatus, getProfilePic, readableActiveDuration, toTitleCase } from "@/others/function"
import ProfilePic from "../other/profile-pic"
import { Link } from "@inertiajs/react"
import AuthContext from "@/context-provider/auth-provider"
import { useContext, useState, useEffect, useRef } from "react"
import SearchBar from "../input/search-bar"
import { DashboardService } from "@/others/services/dashboard-service"
import { AlertCircle } from "lucide-react"

const LatestActiveAccountList = ({ dataKey = 'active', ...props }) => {
    const { usr, onlineUserIds } = useContext(AuthContext)
    const [list, setList] = useState(props.list);
    const [user_list, setUserList] = useState(props.list);
    const [search, setSearch] = useState("");
    const debounceRef = useRef(null);

    // Re-fetch this widget's scoped active-user list whenever the global
    // online-presence set changes (someone logs in/out), so it updates live.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            DashboardService.getActiveUsers((res) => {
                const fresh = res?.[dataKey] ?? [];
                setList(fresh);
                setUserList(search ? filterList(fresh, search) : fresh);
            });
        }, 800);

        return () => clearTimeout(debounceRef.current);
    }, [onlineUserIds]);

    const filterList = (source, value) => {
        return source.filter((item) => {
            const fullName = `${item.profile?.first_name ?? ""} ${item.profile?.middle_name ?? ""} ${item.profile?.last_name ?? ""}`.toLowerCase();
            const userId = String(item.id_number ?? "").toLowerCase();

            return fullName.includes(value) || userId.includes(value);
        });
    };

    const userType = () => {
        switch(usr.role) {
            case 'super_admin':
                return 'Users'
            case 'sub_admin':
                return 'Students'
            case 'teaching_staff':
                return 'Students'
            default:
                return props.type
        }
    }
    // SEARCH HANDLER
    const handleSearch = (e) => {
        const value = e.target.value.toLowerCase();
        setSearch(value);

        // If empty input → reset full list
        if (!value.trim()) {
            setUserList(list);
            return;
        }

        setUserList(filterList(list, value));
    };


    return (
        <div className="w-full rounded-md shadow-md shadow-black/20 bg-white">
            <div className="p-5 py-2 border-b-[1px] border-gray-300 grid gap-2">
                <div className="w-full flex items-center gap-3 text-[0.9em]">   
                    <div 
                        className={`
                            bg-green-600 
                            rounded-[100%] 
                        `}
                        style={{height: `0.8rem`, width: `0.8rem`}}
                    >
                    </div>
                    <div><b>Active {userType()}</b></div>
                    
                </div>
                <div>
                    <SearchBar
                        plc='Search User'
                        h='h-[2.2rem]'
                        search={search}
                        setSearch={setSearch}
                        handleSearch={handleSearch}
                    />
                </div>
            </div>
            <div className="px-4 py-3 h-[20rem] w-full overflow-auto overflow-x-hidden z-2">
                {user_list != null
                ?
                ((user_list.length != 0)
                ?
                user_list.map((e, i) => 
                    <div key={i}>
                        <Row data={e} />
                    </div>
                )
                :
                <div className="text-[1em] text-gray-500 w-full grid place-items-center h-full">
                    <div className="grid place-items-center">
                        <div className="text-[4em] grid place-items-center">
                            <AlertCircle size="1em" />
                        </div>
                        <div>No Active {userType()} Yet</div>
                    </div>
                 </div>)
                :
                <div className="w-full h-full flex justify-center items-center text-[0.9em] text-gray-500">
                    Loading...
                </div>
                }
            </div>
        </div>
    )
}

const Row = ({ data }) => {
    const { isUserOnline } = useContext(AuthContext)

    return (
        <Link className="w-full" href={`/profile/${data.username}`}>
            <div className="py-1 px-3 flex justify-between hover:bg-gray-200 items-center border-b">
                <div className="flex gap-3 items-center">
                    <div>
                        <ProfilePic
                            size={2.5}
                            src={getProfilePic(data.profile?.profile_picture, data.profile?.sex)}
                            showActive={true}
                            isActive={isUserOnline(data.id) || checkActiveStatus(data.last_seen)}
                            activeBorderColor='border-white border-[3px]'
                        />
                    </div>
                    <div>
                        <h1 className="text-[0.9em] overflow-hidden w-20 text-ellipsis text-nowrap"><b>{data.profile?.first_name}</b></h1>
                        <h1 className="text-[0.7em]">{toTitleCase(data.role ?? "")}</h1>
                    </div>
                </div>
                <div className="text-[0.7em] flex mt-1">
                    <div>{readableActiveDuration(data.last_seen)}</div>
                </div>
            </div>
        </Link>
    )
}
export default LatestActiveAccountList