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
    // vid only: rejects a video longer than this. Checked client-side by
    // loading the file's own metadata (no upload/server round trip needed).
    maxDurationSeconds,
    // Called with a human-readable message whenever a video is rejected
    // (over the size/duration/count limit) so the parent form can surface
    // why nothing was added — silent drops are fine for pics (the limits
    // are obvious at a glance) but not for a duration limit the user can't
    // see just by looking at the file.
    onError = () => {},
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
        e.target.value = ""

        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return

        // Was only checking the size of this one batch against maxCount —
        // uploading in smaller batches (e.g. 2, then 2, then 2) could blow
        // past the limit entirely since it never looked at what was already
        // added.
        const remainingSlots = maxCount - reqFileList.length
        if (remainingSlots <= 0) {
            onError(`You can only upload up to ${maxCount} picture${maxCount === 1 ? "" : "s"}.`)
            return
        }

        const accepted = imageFiles.slice(0, remainingSlots)
        if (accepted.length < imageFiles.length) {
            onError(`You can only upload up to ${maxCount} picture${maxCount === 1 ? "" : "s"}.`)
        }

        const newImages = accepted.map((f) => ({
            src: URL.createObjectURL(f), // preview
            file: f, // keep actual file
        }));

        setFileList((prev) => [...prev, ...newImages]);
        setReqFileList((prev) => [...prev, ...accepted]); // append, not overwrite
    }
    const vidChange = (e) => {
        const files = Array.from(e.target.files)
        const videoFiles = files.filter((file) => file.type.startsWith("video/"))

        // Reset now (not at the end) so picking the exact same file twice in
        // a row still fires onChange the second time.
        e.target.value = ""

        if (videoFiles.length === 0) return

        const remainingSlots = maxCount - reqFileList.length
        if (remainingSlots <= 0) {
            onError(`You can only upload up to ${maxCount} video${maxCount === 1 ? "" : "s"}.`)
            return
        }

        const accepted = videoFiles.slice(0, remainingSlots)
        if (accepted.length < videoFiles.length) {
            onError(`You can only upload up to ${maxCount} video${maxCount === 1 ? "" : "s"}.`)
        }

        accepted.forEach((file) => {
            if (maximumSize && file.size > maximumSize * 1024 * 1024) {
                onError(`"${file.name}" is larger than ${maximumSize}MB.`)
                return
            }

            const fileURL = URL.createObjectURL(file)

            if (!maxDurationSeconds) {
                generateThumbnail(fileURL, file)
                return
            }

            // Duration lives in the file's own metadata — read it before
            // accepting the file, no upload needed to check this.
            const probe = document.createElement("video")
            probe.preload = "metadata"
            probe.src = fileURL
            probe.onloadedmetadata = () => {
                if (probe.duration > maxDurationSeconds) {
                    onError(`"${file.name}" is longer than ${Math.round(maxDurationSeconds / 60)} minute${maxDurationSeconds === 60 ? "" : "s"}.`)
                    URL.revokeObjectURL(fileURL)
                    return
                }
                generateThumbnail(fileURL, file)
            }
        })
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

            setFileList((prev) => [...prev, { src: thumbnailURL, file: file }]);
            setReqFileList((prev) => [...prev, file]);

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
                <div className="flex gap-2 pb-2 w-full overflow-hidden overflow-x-auto">
                    {multiple && type !== "pdf" && (
                    <label
                        htmlFor={id}
                        className="bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 cursor-pointer text-gray-400 hover:text-gray-500 w-[6rem] h-[15rem] rounded-md flex-shrink-0 grid place-items-center transition-colors"
                    >
                        <Plus size={22} />
                    </label>
                    )}
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
                    multiple={(type === "pic" || type === "vid") && multiple}
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
                {/* New uploads carry a generated data-URL thumbnail; existing
                    (already-uploaded) videos only have a link to the raw
                    video file itself, which an <img> can't render — show a
                    generic icon for those instead. */}
                {src?.startsWith("data:") ? (
                    <img src={src} alt="" className="absolute" />
                ) : (
                    <FileText size="5.5em" className="text-gray-500" />
                )}
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