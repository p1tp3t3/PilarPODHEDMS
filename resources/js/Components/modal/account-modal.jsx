import { getProfilePic } from "@/others/function"
import ProfilePic from "../other/profile-pic"
import { Link, router } from "@inertiajs/react"
import { motion, AnimatePresence } from "framer-motion"
import { User, Settings, Wrench, LogOut } from "lucide-react"

const AccountModal = (props) => {
    const popup = (props.click) ? 'z-[1] opacity-1 visible' : 'z-[-1] opacity-0 invisible',
          user = props.user,
          identity = props.identity ?? user

    const listStyle = 'px-2 py-2 cursor-pointer text-black text-[0.8em] rounded-[5px] flex gap-2 items-center transition-[0.3s] hover:bg-gray-400/20'
    return (
        <AnimatePresence>
        {props.click &&
        <motion.div
            ref={props.refs}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 rounded w-full sm:w-[17rem] border-[1px] shadow-md px-4 flex-shrink-0 flex-grow-0 bg-white justify-self-end mt-[2.8rem]"
        >
            <div className="w-full py-3">
                <div className="">
                    <div className="flex gap-1 items-center justify-center py-4">
                        <div className="grid place-items-center">
                            <ProfilePic src={getProfilePic(identity.profile?.profile_picture, identity.profile?.sex)} size={5} />
                            <div className="text-center">
                                <p className="text-[1.1em]"><b>{`${identity.profile?.first_name ?? ''} ${identity.profile?.last_name ?? ''}`}</b></p>
                                <p className="text-[0.8em]"><b>@{user.username}</b></p>
                            </div>
                        </div>
                    </div>
                    <div className="py-1"><div className="h-[1px] bg-gray-400 w-full"></div></div>
                    <div>
                        <ul className="p-0 list-none">
                            <Link href={`/profile/${props.user.username}`}>
                                <li className={listStyle}>
                                    <div className="h-[1.8rem] w-[1.8rem] bg-gray-500 text-[1.2em] text-white rounded-[100%] grid place-items-center">
                                        <User size={16} />
                                    </div>
                                    <div>See Profile</div>
                                </li>
                            </Link>
                            <Link href={'/settings/' + user.username}>
                                <li className={listStyle}>
                                    <div className="h-[1.8rem] w-[1.8rem] bg-gray-500 text-[1.2em] text-white rounded-[100%] grid place-items-center">
                                        <Settings size={16} />
                                    </div>
                                    <div>Account Settings</div>
                                </li>
                            </Link>
                            {user.role == 'super_admin' &&
                            <Link href='/maintenance'>
                                <li className={listStyle}>
                                    <div className="h-[1.8rem] w-[1.8rem] bg-gray-500 text-[1.2em] text-white rounded-[100%] grid place-items-center">
                                        <Wrench size={16} />
                                    </div>
                                    <div>Maintenance</div>
                                </li>
                            </Link>}
                            <button 
                                className="w-full" 
                                onClick={() => {
                                    localStorage.removeItem('is-unresolved-complaint-modal-clicked');
                                    router.visit('/log-out');
                                }}
                            >
                                <li className={listStyle}>
                                    <div className="h-[1.8rem] w-[1.8rem] bg-gray-500 text-[1.2em] text-white rounded-[100%] grid place-items-center">
                                        <LogOut size={16} />
                                    </div>
                                    <div>Log Out</div>
                                </li>
                            </button>
                        </ul>
                    </div>
                </div>
            </div>
        </motion.div>
        }
        </AnimatePresence>
    )
}
export default AccountModal