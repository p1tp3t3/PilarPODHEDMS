import ProfilePic from "./profile-pic";
import { useState, useEffect, useRef, useContext } from "react";
import NotificationModal from "../modal/notification-modal";
import AccountModal from "../modal/account-modal";
import { getChannelList, getProfilePic } from "../../others/function";
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
import { Home, Menu, Phone, MessageCircle, Bell } from "lucide-react";

const AuthHeader = (props) => {
  const [pane, setOpenPanelId] = useState(null),
    panel = useRef({ notif: null, profile: null }),
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
      }
    )
    .configure('enable notification')
  }, []);

  useEffect(() => {
    NotificationService.getInitial(usr.id, 4, (e) => {
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

      <header className="w-full px-5 py-2 bg-blue-500 grid sticky top-0 z-20 shadow-md">
        <div className="w-full flex justify-between relative">
          <div className="flex gap-2">
            {props.profile && (
              <a href={`/dashboard`}>
                <IconButton sx={btnSx}>
                  <Home size={18} />
                </IconButton>
              </a>
            )}
            <IconButton
                sx={{ ...btnSx, "@media (min-width:768px)": { display: "none" } }}
                onClick={() => {
                  const aside = document.querySelector("aside"),
                        bg = document.querySelector('#sidebar-overlay')
                  aside.classList.toggle("max-[768px]:w-0")
                  bg.classList.toggle('hidden')
                }}>
                <Menu size={18} />
            </IconButton>
          </div>

          <div className="grid relative">
            <div className="flex gap-2">
              {props.user.role == "sub_admin" && (
                <IconButton
                  sx={btnSx}
                  onClick={() => openCallIn(true)}
                >
                  <Phone size={18} />
                </IconButton>
              )}
              <a href="/chat">
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
                    size={2.5}
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

          <NotificationModal
            click={pane == "notif"}
            refs={(el) => (panel.current.notif = el)}
            list={notifList}
            setter={[setNotifList, setNotifCount, setSize]}
            user={props.user}
            size={size}
          />
        </div>
      </header>
    </>
  );
};

export default AuthHeader;
