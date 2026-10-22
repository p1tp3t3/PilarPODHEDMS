import ProfilePic from "./profile-pic";
import { useState, useEffect, useRef, useContext } from "react";
import NotificationModal from "../modal/notification-modal";
import AccountModal from "../modal/account-modal";
import { getChannelList, getProfilePic, playNotificationSound } from "../../others/function";
import CallInModal from "../modal/submission-form/call-in-modal";
import { UserService } from "@/others/services/user-service";
import { NotificationService } from "@/others/services/notification-service";
import { BroadcastManager } from "@/others/classes/broadcast-manager";
import Toast from "../modal/view/toast";
import AuthContext from "@/context-provider/auth-provider";
import { Link, usePage } from "@inertiajs/react";
import { Broadcast } from "@/others/classes/broadcast-cofiguration";
import { IconButton } from "@mui/material";
import { ChatService } from "@/others/services/chat-service";
import { Home, Phone, MessageCircle, Bell, UsersRound } from "lucide-react";
import ActiveUsersModal, { canSeeActiveUsers, useActiveUsers } from "../modal/active-users-modal";
import MobileBottomNav from "../sidebar/mobile-bottom-nav";
import { useIsMobile } from "@/others/use-is-mobile";

const AuthHeader = (props) => {
  const [pane, setOpenPanelId] = useState(null),
    panel = useRef({ notif: null, profile: null, active: null }),
    [student_list, setStudentList] = useState([]),
    [notifList, setNotifList] = useState(null),
    [notifCount, setNotifCount] = useState(0),
    [callIn, openCallIn] = useState(false),
    [chatUnread, setChatUnread] = useState(0),
    [size, setSize] = useState(null);

  const { usr, toast, toastLabel, toastIcon, openToast } =
    useContext(AuthContext);

  // Reliably eager-loaded regardless of which page's controller built
  // `usr`/`props.user` — see HandleInertiaRequests.
  const { auth } = usePage().props
  const identity = auth?.user ?? usr
  const isMobile = useIsMobile()
  const showActiveUsers = canSeeActiveUsers(props.user.role)
  const activeUsers = useActiveUsers()

  useEffect(() => {
    const handlePopUpRemove = (e) => {
      if (!Object.values(panel.current).some((ref) => ref?.contains(e.target))) {
        setOpenPanelId(null);
      }
    };
    document.addEventListener("click", handlePopUpRemove);
    if(props.user.role == 'sub_admin') {
      UserService.getAllStudents(setStudentList);
    }
    return () => document.removeEventListener("click", handlePopUpRemove);
  }, []);

  useEffect(() => {
    const user_id = props.user.id,
      user = props.user,
      broadcastType = "private",
      channelList = getChannelList(user_id),
      enableNotif = false;

    new Broadcast(
      broadcastType,
      'notify.' + user_id,
      'NotifyUser',
      (e) => {
        setNotifList(e.response)
        setNotifCount(e.count)
        setSize(e.size)
        playNotificationSound()
      }
    )
    .configure('enable notification')
  }, []);

  useEffect(() => {
    NotificationService.getInitial(usr.encrypted_id, 4, (e) => {
        setNotifCount(e.unread_count);
        setNotifList(e.notif);
        setSize(e.size);
      },
      (err) => console.log(err)
    );
  }, []);

  useEffect(() => {
    ChatService.getUnreadCount((e) => setChatUnread(e.unread_count), () => {});

    new Broadcast(
      'private',
      'chat.' + props.user.id,
      'MessageSent',
      (e) => setChatUnread(e.unread_count)
    ).configure('enable chat badge');
  }, []);

  const handleTogglePanel = (panelId) => {
    setOpenPanelId((prevId) => (prevId === panelId ? null : panelId));
  };


  const btnSx = {
    height: "2.5rem",
    width: "2.5rem",
    "@media (max-width:767px)": { height: "2.15rem", width: "2.15rem" },
    position: "relative",
    borderRadius: "100%",
    fontSize: "1.2em",
    color: "#000",
    backgroundColor: "#fff",
    "&:hover": { backgroundColor: "rgba(0,0,0,0.3)" },
    "&:active": { backgroundColor: "rgba(0,0,0,0.5)" },
  };
  const activeBtnSx = {
    ...btnSx,
    color: "#1d4ed8",
    backgroundColor: "#bfdbfe",
    "&:hover": { backgroundColor: "#bfdbfe" },
  };

  return (
    <>
      {props.user.role == "sub_admin" && (
        <>
          {toast && (
            <Toast
              label={toastLabel}
              icon={toastIcon}
              closeToast={openToast}
            />
          )}
          <CallInModal
            close={callIn}
            closeModal={openCallIn}
            user_id={props.user.id}
            pd={["px-5", "py-7"]}
            isEnableOuterClose={true}
            student_list={student_list}
          />
        </>
      )}

      <header className="w-full px-3 md:px-5 py-2 bg-blue-500 grid sticky top-0 z-20 shadow-md">
        <div className="w-full flex justify-between items-center relative">
          <div className="flex gap-2 items-center min-w-0">
            {props.profile && (
              <a href={`/dashboard`} className="hidden md:block">
                <IconButton sx={btnSx}>
                  <Home size={18} />
                </IconButton>
              </a>
            )}
            <Link href="/dashboard" className="md:hidden flex items-center gap-1.5 min-w-0">
              <ProfilePic src={"/default-pic/pilar.png"} size={1.9} />
              <span className="text-white font-bold text-[0.95em] truncate">PilarPODHEDMS</span>
            </Link>
          </div>

          <div className="grid relative shrink-0">
            <div className="flex gap-1.5 md:gap-2 items-center">
              {props.user.role == "sub_admin" && (
                <IconButton
                  sx={btnSx}
                  onClick={() => openCallIn(true)}
                >
                  <Phone size={18} />
                </IconButton>
              )}
              {showActiveUsers && (
                <IconButton
                  sx={pane == "active" ? activeBtnSx : btnSx}
                  title="Active users"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePanel("active");
                  }}
                >
                  <UsersRound size={18} />
                  {activeUsers.length > 0 && (
                    <div className="absolute top-6 right-0 min-w-[1.2rem] h-[1.2rem] px-1 text-[0.6em] grid place-items-center bg-green-600 text-white rounded-full">
                      {activeUsers.length > 99 ? "99+" : activeUsers.length}
                    </div>
                  )}
                </IconButton>
              )}
              <a href="/chat" className="hidden md:block">
                <IconButton sx={btnSx}>
                  <MessageCircle size={18} />
                  {(chatUnread != 0) && (
                    <div className="absolute top-1 right-1 w-[1.2rem] h-[1.2rem] text-[0.6em] grid place-items-center bg-red-600 text-white rounded-full">
                      {chatUnread > 9 ? "9+" : chatUnread}
                    </div>
                  )}
                </IconButton>
              </a>
              <div className="h-full grid">
                <IconButton
                  sx={pane == "notif" ? activeBtnSx : btnSx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePanel("notif");
                  }}
                >
                  <Bell size={18} />
                  {(notifCount != 0) && (
                    <div className="absolute top-6 right-0 w-[1.2rem] h-[1.2rem] text-[0.6em] grid place-items-center bg-red-600 text-white rounded-full">
                      {notifCount > 9 ? "9+" : notifCount}
                    </div>
                  )}
                </IconButton>
              </div>
              <div className="relative">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePanel("profile");
                  }}
                  sx={{ padding: 0, borderRadius: "100%" }}
                >
                  <ProfilePic
                    src={getProfilePic(identity.profile?.profile_picture, identity.profile?.sex)}
                    size={isMobile ? 2.15 : 2.5}
                  />
                </IconButton>
              </div>
            </div>
          </div>

          {/* ✅ Responsive modals: fixed full-width on mobile */}
          <AccountModal
            addPicRoute={props.addPicRoute}
            user={props.user}
            identity={identity}
            authType={props.user}
            click={pane == "profile"}
            refs={(el) => (panel.current.profile = el)}
          />

          {showActiveUsers && (
            <ActiveUsersModal
              click={pane == "active"}
              refs={(el) => (panel.current.active = el)}
            />
          )}

          <NotificationModal
            click={pane == "notif"}
            count={notifCount}
            refs={(el) => (panel.current.notif = el)}
            list={notifList}
            setter={[setNotifList, setNotifCount, setSize]}
            user={props.user}
            size={size}
          />
        </div>
      </header>
      <MobileBottomNav chatUnread={chatUnread} />
    </>
  );
};

export default AuthHeader;
