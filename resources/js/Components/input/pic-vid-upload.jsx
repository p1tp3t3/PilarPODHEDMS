import { useRef } from "react"
import { Plus, X, Play, FileText } from "lucide-react"

const PicVidUpload = ({
    type,
    label,
    multiple,
    def,
    fileList,
    name,
    id,
    reqFileList,
    setFileList,
    setReqFileList,
    maximumSize,
    maxCount = 2,
    // Optional: already-uploaded files (e.g. when editing a form) shown in
    // the same row as new uploads — [{ key, src, type, href }]. Removing one
    // calls onRemoveExisting(key) — a soft-hide on the backend, not a real
    // delete, so the underlying record/log is preserved either way.
    existingList = [],
    onRemoveExisting = () => {},
}) => {
    const canvasRef = useRef(null)
    
    const removeFile = (id) => {
        const newPicList = fileList.filter((val, index) => index !== id)
        const newReqPicList = reqFileList.filter((val, index) => index !== id)

        setFileList(newPicList)
        setReqFileList(newReqPicList)
    }
    const fileChange = (e) => {
        if (type === "pic") picChange(e)
        else if (type === "vid") vidChange(e)
        else if (type === "pdf") pdfChange(e)
    }
    const picChange = (e) => {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));

        const newImages = imageFiles.map((f) => ({
            src: URL.createObjectURL(f), // preview
            file: f, // keep actual file
        }));

        if(newImages.length > maxCount) return

        setFileList((prev) => [...prev, ...newImages]);
        setReqFileList((prev) => [...prev, ...imageFiles]); // append, not overwrite
    }
    const vidChange = (e) => {
        const files = Array.from(e.target.files)
        const f  = files[0]
        const videoFiles = files.filter((file) => file.type.startsWith("video/"))
        
        if (!f) return;

        if (!f.type.startsWith("video/")) {
            return;
        }

        if (f.size > maximumSize * 1024 * 1024) {
            return;
        }

        videoFiles.forEach((file) => {
            const fileURL = URL.createObjectURL(file);
            generateThumbnail(fileURL, file);
        });
        setReqFileList(files)
    }
    const generateThumbnail = (videoURL, file) => {
        const video = document.createElement("video");
        video.src = videoURL;
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.currentTime = 1;
        video.style.display = "none";

        video.onloadeddata = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const thumbnailURL = canvas.toDataURL("image/png");

            setFileList((prev) => [...prev, { id: prev.length + 1, src: thumbnailURL, file: file }]);

            video.remove();
        }
    }
    const pdfChange = (e) => {
        const files = Array.from(e.target.files)
        const f = files[0]

        if (!f) return

        if (f.type !== "application/pdf") {
            return
        }

        if (f.size > maximumSize * 1024 * 1024) {
            return
        }

        const filePreview = {
            src: "/pdf-icon.png", // fallback static icon (replace with your own)
            name: f.name,
            file: f,
        }

        setFileList([filePreview]) // only one PDF allowed
        setReqFileList([f])
    }

    return (
        <div className="grid gap-2 w-full">
            <div className="text-[0.8em]">{label}</div>
            <div>
                {(fileList.length !== 0 || existingList.length !== 0) ? (
                <div className="grid gap-3">
                    {multiple && type !== "pdf" && (
                    <label
                        htmlFor={id}
                        className="bg-blue-500 cursor-pointer text-white w-[2rem] h-[2rem] rounded-full flex-shrink-0 grid place-items-center"
                    >
                        <Plus size={14} />
                    </label>
                    )}
                    <div className="flex gap-2 pb-2 w-full overflow-hidden overflow-x-auto">
                    {existingList.map((e) => (
                        <div className="h-full" key={`existing-${e.key}`}>
                        <File
                            type={e.type ?? type}
                            onRemove={() => onRemoveExisting(e.key)}
                            href={e.href}
                            src={e.src}
                            name={e.name}
                        />
                        </div>
                    ))}
                    {fileList.map((e, i) => (
                        <div className="h-full" key={i}>
                        <File
                            type={type}
                            onRemove={() => removeFile(i)}
                            src={e.src}
                            name={e.name}
                        />
                        </div>
                    ))}
                    </div>
                </div>
                ) : (
                <label
                    htmlFor={id}
                    className="cursor-pointer h-[10rem] grid place-items-center border-[4px] border-gray-500 border-dashed rounded-lg"
                >
                    <div className="text-[0.8em]">{def}</div>
                </label>
                )}
                <input
                    type="file"
                    className="hidden"
                    id={id}
                    name={name}
                    accept={
                        type === "pic"
                        ? "image/png, image/jpeg"
                        : type === "vid"
                        ? "video/mp4, video/wav"
                        : "application/pdf"
                    }
                    multiple={type === "pic" && multiple}
                    onChange={fileChange}
                />
            </div>
        {type === "vid" && <canvas ref={canvasRef} className="hidden"></canvas>}
        </div>
    )
}

const File = ({ type, onRemove, src, href, name }) => {
    const content = (
        <>
            <div className="justify-self-end self-start z-10">
                <button
                type="button"
                className="bg-white w-[1.2rem] h-[1.2rem] rounded-full text-[0.8em]"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove() }}
                >
                <X size={12} />
                </button>
            </div>

            {type === "pic" && <img src={src} alt="" className="absolute" />}
            {type === "vid" && (
                <>
                <img src={src} alt="" className="absolute" />
                <button
                    type="button"
                    className="cursor-default absolute w-[2rem] h-[2rem] text-white/80 bg-black/80 rounded-full z-10"
                >
                    <Play size={16} />
                </button>
                </>
            )}
            {type === "pdf" && (
                <div className="flex flex-col items-center justify-center text-center">
                    <FileText size="5.5em" className="text-red-600" />
                    <span className="text-[0.7em] mt-1 truncate w-[4rem]">{name}</span>
                </div>
            )}
        </>
    )

    const className = "bg-gray-300 w-[13rem] h-[15rem] rounded-md object-cover overflow-hidden grid place-items-center relative p-1 flex-shrink-0"

    return href
        ? <a href={href} target="_blank" rel="noreferrer" className={className}>{content}</a>
        : <div className={className}>{content}</div>
}

export default PicVidUpload