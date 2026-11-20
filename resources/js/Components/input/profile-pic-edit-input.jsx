import { useState } from "react";
import ProfilePic from "../other/profile-pic"
import ImageCropper from "./cropper"
import { base64ToFile } from "@/others/function";
import { Pencil } from "lucide-react"



const ProfilePicEdit = ({ 
    setPreview, 
    preview, 
    handleFileChange, 
    profilePic, 
    profileChange, 
    enableCrop = false,
    req = false,
    error = null,
}) => {
    const [finalPic, setFinalPic] = useState(null)

    const handleCropped = (croppedDataUrl) => {
        const name = base64ToFileName(croppedDataUrl, 'profile');
        const file = base64ToFile(croppedDataUrl, name)

        setFinalPic(croppedDataUrl)
        setPreview(null)
        profileChange(file)
    };
    const base64ToFileName = (base64, prefix = "file") => {
        const mimeMatch = base64.match(/^data:(.*?);base64,/);
        let extension = "bin";

        if (mimeMatch) {
            const mime = mimeMatch[1];
            extension = mime.split("/")[1];
        }

        return `${prefix}_${Date.now()}.${extension}`;
    }

    return (
        <>
        {!preview &&
        <div className="relative w-[10rem] h-[10rem]">
            <ProfilePic
                src={finalPic || preview || profilePic}
                size={10}
            />
            <input
                type="file"
                name="profile_picture"
                id="edit-pic"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                required={req}
            />
            <label
                htmlFor="edit-pic"
                type="button"
                className="cursor-pointer w-[2.2rem] grid place-items-center bottom-0 right-1 h-[2.2rem] rounded-full absolute bg-blue-600 text-white"
            >
                <Pencil size={14} />
            </label>
        </div>}
        {(preview && enableCrop) && (
            <ImageCropper preview={preview} setPreview={setPreview} onCropped={handleCropped} />
        )}
        {error &&
        <div className="text-[#d12323] text-[12px]">
            <div className="transition-[0.2s] font-[1000]">
                {error}
            </div>
        </div>}
        </>
    )
}
export default ProfilePicEdit