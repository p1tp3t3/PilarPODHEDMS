import ListSkeleton from "../reload/list-skeleton";
import { checkActiveStatus, getProfilePic, toTitleCase, profileUrl, showUserType } from "@/others/function"
import LiveActiveSince from "@/Components/other/live-active-since"
import ProfilePic from "../other/profile-pic"
import AuthContext from "@/context-provider/auth-provider"
import { useContext, useState, useEffect, useRef } from "react"
import SearchBar from "../input/search-bar"
import { DashboardService } from "@/others/services/dashboard-service"
import { AlertCircle } from "lucide-react"
import DropdownField from "../input/dropdown"
import { List } from "@mui/material"
import { MuiListEmpty, MuiRow } from "./mui-list-parts"

// Admins (System Admin, prefect) see every active user and can narrow the list
// down by role.
const ROLE_OPTIONS = [
    { val: "super_admin", label: "System Admin" },
    { val: "sub_admin", label: "Prefect" },
    { val: "student", label: "Student" },
    { val: "program_head", label: "Program Head" },
    { val: "faculty", label: "Faculty" },
    { val: "non_teaching_staff", label: "Non-Teaching Staff" },
    { val: "parent", label: "Parent" },
]

const LatestActiveAccountList = ({ dataKey = 'active', ...props }) => {
    const { usr, onlineUserIds } = useContext(AuthContext)
    const [list, setList] = useState(props.list);
    const [user_list, setUserList] = useState(props.list);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    // Faculty only see students, so they get no role filter.
    const showRoleFilter = ['super_admin', 'sub_admin', 'program_head'].includes(usr?.role);
    // Program heads only ever see students and fellow teachers.
    const roleOptions = usr?.role === 'program_head'
        ? ROLE_OPTIONS.filter((r) => ['student', 'program_head', 'faculty'].includes(r.val))
        : ROLE_OPTIONS;
    const debounceRef = useRef(null);

    // Re-fetch this widget's scoped active-user list whenever the global
    // online-presence set changes (someone logs in/out), so it updates live.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            DashboardService.getActiveUsers((res) => {
                const fresh = res?.[dataKey] ?? [];
                setList(fresh);
                setUserList(filterList(fresh, search, roleFilter));
            });
        }, 800);

        return () => clearTimeout(debounceRef.current);
    }, [onlineUserIds]);

    const filterList = (source, value = "", role = "all") => {
        return (source ?? []).filter((item) => {
            if (role !== "all" && item.role !== role) return false;
            if (!value) return true;
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
                return 'Users'
            case 'program_head':
            case 'faculty':
                return 'Users'
            default:
                return props.type
        }
    }
    // SEARCH HANDLER
    const handleSearch = (e) => {
        const value = e.target.value.toLowerCase();
        setSearch(value);
        setUserList(filterList(list, value.trim(), roleFilter));
    };

    const handleRoleFilter = (e) => {
        setRoleFilter(e.target.value);
        setUserList(filterList(list, search.trim(), e.target.value));
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
                <div className={showRoleFilter ? "grid gap-2" : ""}>
                    <div className="flex-1 min-w-0">
                        <SearchBar
                            plc='Search User'
                            h='h-[2.2rem]'
                            search={search}
                            setSearch={setSearch}
                            handleSearch={handleSearch}
                        />
                    </div>
                    {showRoleFilter && (
                        <div className="w-full">
                            <DropdownField
                                default={{ val: "all", label: "All Roles" }}
                                list={roleOptions}
                                val={roleFilter}
                                onChange={handleRoleFilter}
                                name="active_role_filter"
                                keepCase={true}
                            />
                        </div>
                    )}
                </div>
            </div>
            <div className="px-2 py-2 h-[20rem] w-full overflow-auto overflow-x-hidden z-2">
                {user_list != null
                ?
                ((user_list.length != 0)
                ?
                <List disablePadding>
                    {user_list.map((e) => <Row key={e.id} data={e} />)}
                </List>
                :
                <MuiListEmpty icon={AlertCircle} title={`No Active ${userType()} Yet`} sx={{ height: "100%" }} />)
                :
                <ListSkeleton rows={4} />
                }
            </div>
        </div>
    )
}

const Row = ({ data }) => {
    const { isUserOnline } = useContext(AuthContext)

    return (
        // First and last name; the subtitle is what's unique to their role
        // (program and year, program taught, position).
        <MuiRow
            href={profileUrl(data)}
            avatar={
                <ProfilePic
                    size={2.4}
                    src={getProfilePic(data.profile?.profile_picture, data.profile?.sex)}
                    showActive={true}
                    isActive={isUserOnline(data.id) || checkActiveStatus(data.last_seen)}
                    activeBorderColor='border-white border-[3px]'
                />
            }
            primary={toTitleCase([data.profile?.first_name, data.profile?.last_name].filter(Boolean).join(" "))}
            secondary={showUserType(data) ?? ROLE_OPTIONS.find((r) => r.val === data.role)?.label ?? toTitleCase(data.role ?? "")}
            right={<LiveActiveSince userId={data.id} lastSeen={data.last_seen} className="text-[1em]" align="right" />}
        />
    )
}
export default LatestActiveAccountList