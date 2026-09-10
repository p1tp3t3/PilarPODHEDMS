import axios from "axios";
import CryptoJS from "crypto-js";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { PushNotificationService } from "./services/push-notification-service";

const MySwal = withReactContent(Swal)
const cryptoKey = 'gh4mdvcf'

// Notification `content` is normally real JSON (json_encode on the backend),
// but some legacy rows were written with single-quoted pseudo-JSON that a
// blind `.replace(/'/g, '"')` used to "fix" — which corrupts real JSON the
// moment an interpolated value (a name) legitimately contains an apostrophe.
// Try real JSON first; only fall back to the quote-swap for old rows, and
// never throw either way.
export const parseNotifContent = (raw) => {
    if (typeof raw !== 'string' || raw === '') return {}
    try {
        return JSON.parse(raw)
    } catch {
        try {
            return JSON.parse(raw.replace(/'/g, '"'))
        } catch {
            return {}
        }
    }
}


export const showProgressBar = (label, percent) =>  {
    const Toast = Swal.mixin({
        toast: true,
        position: "bottom-end",
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        timerProgressBar: false,
        background: "#f0f0f0",
        didOpen: (toast) => {
            const bar = document.createElement("div");
            bar.style.height = "6px";
            bar.style.width = `${percent}%`;
            bar.style.backgroundColor = "#2563eb";
            bar.style.transition = "width 0.3s";
            bar.style.borderRadius = "4px";
            bar.id = "progress-bar";
            toast.appendChild(bar);
        },
    });

    Toast.fire({
        title: `${label}: ${percent}%`,
        html: `<div style="font-size:0.9em; color:#333;">Please wait...</div>`,
    });
}

export const showWarningModal = (
    text, 
    confirmButton, 
    cancelButton = 'Cancel', 
    callBackConfirm = () => {}, 
    callBackCancel = () => {}
) => {
    const swalWithBootstrapButtons = MySwal.mixin({
        customClass: {
            confirmButton: "bg-green-600 hover:bg-green-700 px-6 py-2 text-white",
            cancelButton: "bg-red-600 hover:bg-red-700 px-6 py-2 text-white"
        },
        buttonsStyling: true
    });
    swalWithBootstrapButtons.fire({
        text: text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: confirmButton,
        cancelButtonText: cancelButton,
        reverseButtons: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        scrollbarPadding: false
    }).then((result) => {
        if (result.isConfirmed) {
            callBackConfirm()
        }else if (
            result.dismiss === Swal.DismissReason.cancel
        ) {
            callBackCancel()
        }
    });
}

export const showOutputModal = (text = "Success", type = "s", callBack, htmlContent = null) => {
    const modalAtt = {
        's': {
            icon: "success",
            title: "Success",
            text: text,
            confirmButtonColor: "#3085d6",
            html: htmlContent
        },
        'e': {
            icon: "error",
            title: "Error",
            text: text,
            confirmButtonColor: "#d33",
            html: htmlContent,
        },
        'g': {
            icon: "info",
            title: text,
            confirmButtonColor: "#1e90ff",
            confirmButtonText: "Continue",
            html: htmlContent
        },
        'w': {
            icon: "warning",
            title: "Warning",
            text: text,
            confirmButtonColor: "#f59e0b",
            html: htmlContent
        },
    }
    MySwal.fire(modalAtt[type])
              .then(() => {
                if (callBack) callBack();
            });
    
}


export const disablePrevDate = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());

    return today.toISOString().slice(0, 16);
}

export function change(e, setter) {
    const { name, value } = e.target;

    setter((prev) => ({
        ...prev,
        [name]: value,
    }));
}
export function sendData(
    link, 
    d, 
    success = () => {}, 
    error = () => {}
) {
    axios.post(link, d)
        .then((data) => {
            success(data.data);
        })
        .catch((e) => {
            error(e);
        });
}
export function jsonToFormData(json) {
    const formData = new FormData();
    Object.keys(json).forEach((key) => {
        formData.append(key, json[key]);
    });
    return formData;
}
export function getData(
    type,
    link,
    data,
    setter = () => {},
    success = () => {},
    error = () => {}
) {
    switch (type) {
        case "get":
            axios
                .get(link)
                .then((data) => {
                    setter(data.data);
                    success();
                })
                .catch((e) => {
                    console.log(e);
                    error(e);
                });
            break;
        case "post":
            axios
                .post(link, data)
                .then((data) => {
                    setter(data.data);
                    success();
                })
                .catch((e) => {
                    console.log(e);
                    error(e);
                });
            break;
    }
}
export function changeUserActivityStatus(action, status) {
    const d = JSON.stringify({ status: status })
    window.addEventListener(action, () => navigator.sendBeacon(`/activity/status`, d))
}
export const userActivity = () => {
    changeUserActivityStatus('load', true)
    changeUserActivityStatus('beforeunload', false)
}
export function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
export function canViewEnrollmentHistory(viewer) {
    return ['super_admin', 'sub_admin'].includes(viewer?.role) ||
        viewer?.teaching_staff?.position === 'program_head';
}
export function toTitleCase(str) {
    return str
            .replace(/_/g, " ")
            .toLowerCase()
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
}
export function readableDate(d) {
    if (!d) return "N/A"
    const date = new Date(d)

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}
export function readableTime(t) {
    if (!t) return "N/A"
    const date = new Date(t.replace(" ", "T"));

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12

    return `${hours}:${minutes} ${ampm}`;
}

export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
export function fileChange(
    event, 
    setPreview = () => {}, 
    setFile = () => {},
    crop = false
) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result); // base64 preview for CropperJS
            if(!crop) setFile(file);
            console.log(file)
        };
        reader.readAsDataURL(file);
    }
}
export const base64ToFile = (base64, filename) => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}
export function getItemPic(path) {
    return `lost-item/${path}`;
}
export function splitStr(str, type = ',') {
    return (str != undefined
    ? (str != null) ? str.split(type) : null
    : null);
}
const checkPath = () => {
    const isProfile = window.location.pathname.includes('profile'),
          isRegister  = window.location.pathname.includes('register')
    const path = (isProfile || isRegister) ? '../': ''

    return path
}
export const getUserAssetFolder = (id) => {
    const path = checkPath()

    return `${path}../user-assets/${id}`
}
export const getComplaintFolder = (id, caseNumber = null) => {
    return `${getUserAssetFolder(id)}/complaint${(caseNumber != null) ? `/case-no-${caseNumber}` : ''}`
}
export function getProfilePic(file, sex) {
    return (file != null) ? `/storage/profile-pictures/${file}` : `/default-pic/profile-${sex === 'f' ? 'f' : 'm'}-pic.jpg`;
}
export function getProgramLogo(logo) {
    return (logo != null) ? `/storage/program-logos/${logo}` : `/default-pic/sys-icon.png`;
}
/**
const checkPath = () => {
    const isProfile = window.location.pathname.includes('profile'),
          isRegister  = window.location.pathname.includes('register')
    const path = (isProfile || isRegister) ? '../': ''

    return path
}
export const getUserAssetFolder = (id) => {
    const isProfile = window.location.pathname.includes('profile'),
          isRegister  = window.location.pathname.includes('register')
    const path = (isProfile || isRegister) ? '../': ''

    return `${path}../user-assets/${id}`
}
export const getComplaintFolder = (caseNumber = null) => {
    const path = checkPath()

    return `${path}/complaint${(caseNumber != null) ? `/case-no-${caseNumber}` : ''}`
}
export function getProfilePic(file, sex) {
    const path = checkPath()

    return (file != null) ? `${path}../user-profile/${file}` : `${path}../default-pic/profile-${sex}-pic.jpg`;
}
 */
export const configBroadcast = (
    type, 
    broadcast, 
    message, 
    event, 
    callBack = (e)=>{}
) => {
    switch(type) {
        case 'public':
            Echo.channel(broadcast)
                .subscribed(() => {
                    console.log(`subscribed. ready for broadcasting public channel. ${message}`)
                })
                .listen(`${event}`, callBack)
            break
        case 'private':
            Echo.private(broadcast)
                .subscribed(() => {
                    console.log(`subscribed. ready for broadcasting private channel. ${message}`)
                })
                .listen(`${event}`, callBack)
            break
    }
}
export const notify = (
    title, 
    body, 
    icon
) => {
    const data = {
        "title": title,
        "body": body,
        "icon": icon
    }
    sendData(`${getWebLink(null, null, 5000)}/python/webpush`, data)
    /*
    if ("Notification" in window) {
        if (Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: icon,
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("Notification", {
                        body: body,
                        icon: icon,
                    });
                }
            });
        }
    }*/
}
export const check = (e, setter, type = 'val') => {
    const name = e.target.name;
    console.log(name)
    if(type == 'val') {
        if (!name) return;

        const baseName = name.replace(/\[\]$/, ''); // strips [] if present
        const form = e.target.form || e.currentTarget.closest("form") || document;
        const checked = form.querySelectorAll(`input[name="${baseName}[]"]:checked`);
        const values = Array.from(checked).map((input) => input.value);

        setter(prev => ({
            ...prev,
            [baseName]: values
        }));
    }else {
        const val = e.target.checked
        setter((prev) => ({
            ...prev,
            [name]: Number(val)
        }))
    }
}
export const getWebLink = (
    protocol = 'http', 
    domain = "127.0.0.1", 
    port = 8000
) => {
    const p = protocol != null ? protocol : 'http',
          d = domain != null ? domain : "127.0.0.1"

    return `${p}://${d}:${port}`;
}
export const inputValidation = (type, input, length = 8) => {
    switch (type) {
        case 'email':
            return validateEmail(input);
        case 'number':
            return !isNaN(input);
        case 'length':
            return input.length > 0 && input.length <= length;
        case 'phone':
            return input.length == 11 && !isNaN(input);
        case 'contains uppercase and lowercase':
            return /[A-Z]/.test(input) && /[a-z]/.test(input);
        case 'contain number':
            return /\d/.test(input);
        case 'contain special':
            return /[!@#$%^&*(),.?":{}|<>]/.test(input);
        case 'empty':
            return input.length != 0
    }
    return true;
}
export const includeObjAtt = (arr, att) => {
    const filtered = arr.map(obj =>
        Object.fromEntries(
            Object.entries(obj).filter(([key]) => att.includes(key))
        )
    )
    return filtered;
}
export const replaceUnderScoreToSpace = (str) => {
    return str.replace(/_/g, ' ')
}


export const encryptData = (str) => {
    return CryptoJS.AES.encrypt(str, cryptoKey).toString()
}
export const decryptData = (en) => {
    const bytes = Crypto.AES.decrypt(en, cryptoKey)
    return bytes.toString(CryptoJS.enc.Utf8)
}

export const showUserType = (user, showParentRole) => {
    switch(user.role) {
        case 'student': {
            const latestEnrollment = user.enrollments?.[user.enrollments.length - 1]
            const programName = user.program?.name ?? latestEnrollment?.program?.name
            const yearLevel = latestEnrollment?.year_level ? getYearLevel(latestEnrollment.year_level) : null
            return [programName, yearLevel].filter(Boolean).join(" • ") || "Student"
        }
        case 'parent':
            return `${(showParentRole) ? `${toTitleCase(user.parent.parent_role)}` : 'Parent'}`
        case 'teaching_staff':
            return (user.teaching_staff?.position === 'program_head')
                ? `Program Head (${user.teaching_staff?.program?.name ?? ''})`
                : `Faculty (${user.teaching_staff?.program?.name ?? ''})`
        case 'super_admin':
            return `System Admin`
        case 'non_teaching_staff':
            return user.non_teaching_staff?.position ?? `Staff`
        case 'sub_admin':
            return `Prefect of Discipline`
    }
}
export const clearField = (setter) => {
    setter((prev) => {
        const cleared = Object.fromEntries(
            Object.keys(prev).map((key) => [key, ''])
        );
        return cleared;
    })
}
export const getAllCheckBoxValue = (name) => {
    const l = []
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`)

    checkboxes.forEach((e, i) => {
        l.push(e.value)
    })

    return l
}
export const getChannelList = (id) => {
    return [
        [`call_in.${id}`, 'CallInStudent'], //0
        [`complaint.confirmation.${id}`, 'SendComplaintConfirmation'], //1
        [`referral.${id}.send`, 'SendReferral'], //2
        [`absent-form.${id}.send`, 'SendAbsentForm'], //3
        [`absent-form.confirmation.${id}`, 'SendAbsentFormConfirmation'], //4
        [`appointment.${id}.request`, 'AppointmentRequest'], //5,
        [`complaint.${id}.send`, 'SendComplaint'], //6
        [`appointment.${id}.confirmation`, 'AppointmentConfirmation'], //7
        [`gatepass.${id}.send`, 'SendGatePass'], //8
        [`referral.confirmation.${id}`, 'SendReferralConfirmation'], //9
        []
    ]
}
export const getYearLevel = (y) => {
    const levels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    return levels[y - 1] || "N/A";
}

export const validateField = (type, field) => {
    switch (type) {
        case 'alpha-numeric':
            return !(/^[a-z0-9]+$/i.test(field));
        case 'alpha':
            return !(/[a-zA-Z\s]/.test(field));
        case 'upper-alpha':
            return !(/[A-Z]/.test(field));
        case 'char':
            return !(/[!@#$%^&*_\-+=<>?]/.test(field));
        case 'numeric':
            return !(/[0-9]/.test(field));
        case 'email':
            return !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field));
        case 'phone':
            return !(/^\+?[0-9]{7,15}$/.test(field));
        case 'password':
            return !(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(field));
        default:
            return false;
    }
}

export const checkUserExist = async (type, value, id = null) => {
  try {
    const response = await axios.get(`/api/register/validate/${type}/${value}/${id}`)
    return response.data
  } catch (err) {
    console.error("Error checking user:", err)
    return false
  }
}
export const checkCurrentPassword = async (id, value) => {
  try {
    const response = await axios.get(`/api/password/verify/${encodeURIComponent(value)}/${id}`)
    return response.data
  } catch (err) {
    console.error("Error checking user:", err)
    return false
  }
}

export const checkActiveStatus = (lastSeen) => {
    const d = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now - d) / 60000); // Convert milliseconds to minutes

    return diffInMinutes <= 5; // Active if last seen within the last 5 minutes
}

export const readableActiveDuration = (lastSeen) => {
    const d = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = Math.floor((now - d) / 60000); // Convert milliseconds to minutes

    if (diffInMinutes < 1) {
        return "Active just now";
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) { // Less than a day
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInMinutes / 1440);
        //years
        if (days >= 365) {
            const years = Math.floor(days / 365);
            return `${years} year${years > 1 ? 's' : ''} ago`;
        }
        //months
        if (days >= 30) {
            const months = Math.floor(days / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        }
         //weeks
        if (days >= 7) {
            const weeks = Math.floor(days / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        }
         //days only        
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

export const areObjectArraysEqualByKey = (a, b, key) => {
    if (a.length !== b.length) return false;

    const countItems = (arr) =>
        arr.reduce((acc, item) => {
            const value = item[key];
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});

    const countA = countItems(a);
    const countB = countItems(b);

    const allKeys = new Set([...Object.keys(countA), ...Object.keys(countB)]);
    
    for (const key of allKeys) {
        if (countA[key] !== countB[key]) return false;
    }

    return true;
}
export const inArr = (target, arr) => {
    return arr.includes(target)
}

export function canEdit(targetRole, userRole) {
    // Normalize input to avoid case mismatches
    targetRole = String(targetRole).toLowerCase();
    userRole = String(userRole).toLowerCase();

    const editableRoles = {
        itrc: ['student', 'prefect', 'faculty', 'administrative', 'staff', 'parent'],
        prefect: ['student'],
    };

    // If user role is not in the list, deny access
    const allowed = editableRoles[userRole] ?? [];

    return allowed.includes(targetRole);
}

export const registerServiceWorker = (vapidPublicKey) => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidPublicKey) return;

    navigator.serviceWorker.register("/sw.js");
    Notification.requestPermission().then((permission)=> {
        if (permission === 'granted') {
            // get service worker
            navigator.serviceWorker.ready.then((sw)=> {
                // subscribe
                sw.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: vapidPublicKey
                }).then((subscription)=> {
                    const sub = JSON.parse(JSON.stringify(subscription))

                    const data = {
                        endpoint: sub.endpoint,
                        public_key: sub.keys.p256dh,
                        auth: sub.keys.auth
                    }
                    const f = e => console.log('go')
                    PushNotificationService.storeSubscription(data, f, f)
                }).catch(x => console.log(x));
            });
        }
    });
};