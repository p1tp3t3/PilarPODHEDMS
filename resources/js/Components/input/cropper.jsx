import { useRef, useEffect, useState } from 'react'
import Cropper from 'react-cropper'
import { Box, Button, IconButton, Paper, Slider, Stack, Tooltip, Typography } from '@mui/material'
import { RotateCw, Undo2, ZoomIn, ZoomOut } from "lucide-react"

// Crop a new profile photo: a round frame over a dark area; the photo is
// dragged under it and zoomed with the slider (or the mouse wheel); a small
// round preview shows the result. "Use Photo" hands back a 600×600 JPEG.
//
// The frame never goes past the photo's edges: the furthest it zooms out is
// the photo's shorter side just touching the frame (where it opens; a square
// logo then fits whole), up to 4× that; dragging stops at the edges.
const MAX_OVER_COVER = 4

const ImageCropper = ({ preview, onCropped, setPreview }) => {
    const cropperRef = useRef(null)
    const [image, setImage] = useState()
    const [range, setRange] = useState({ min: 0, max: 1 }) // zoom ratios
    // The same range for the wheel handler: the cropper keeps the handler it
    // was created with, so it reads this ref, not the state. Null until ready.
    const rangeRef = useRef(null)
    const [zoom, setZoom] = useState(0)

    useEffect(() => {
        if (preview) setImage(preview)
    }, [preview])

    const cropper = () => cropperRef.current?.cropper

    // Work out the range for the frame and the photo (as rotated), then
    // zoom to "fills the frame" with the photo centred in it.
    const fit = () => {
        const c = cropper()
        if (!c) return
        const box = c.getCropBoxData()
        const img = c.getImageData()
        const sideways = Math.abs(img.rotate ?? 0) % 180 === 90
        const w = sideways ? img.naturalHeight : img.naturalWidth
        const h = sideways ? img.naturalWidth : img.naturalHeight
        const cover = Math.max(box.width / w, box.height / h)
        rangeRef.current = { min: cover, max: cover * MAX_OVER_COVER }
        setRange(rangeRef.current)
        c.zoomTo(cover)
        const canvas = c.getCanvasData()
        c.setCanvasData({
            left: box.left + (box.width - canvas.width) / 2,
            top: box.top + (box.height - canvas.height) / 2,
        })
        setZoom(cover)
    }

    // Slider -> cropper (zooming around the frame's centre).
    const zoomTo = (value) => {
        const c = cropper()
        if (!c) return
        const box = c.getCropBoxData()
        setZoom(value)
        c.zoomTo(value, { x: box.left + box.width / 2, y: box.top + box.height / 2 })
    }

    // Mouse wheel / pinch -> slider; kept within the range.
    const onZoom = (e) => {
        const ratio = e.detail.ratio
        const lim = rangeRef.current
        if (lim && (ratio < lim.min - 1e-6 || ratio > lim.max + 1e-6)) {
            e.preventDefault()
            return
        }
        setZoom(ratio)
    }

    const rotate = () => {
        rangeRef.current = null // let the rotation's own zoom through
        cropper()?.rotate(90)
        fit()
    }

    const reset = () => {
        rangeRef.current = null
        cropper()?.reset()
        fit()
    }

    const discard = () => {
        setImage(null)
        setPreview(null)
    }

    const handleCrop = () => {
        const c = cropper()
        if (!c) return
        const croppedDataUrl = c.getCroppedCanvas({
            width: 600,
            height: 600,
            fillColor: '#fff',
            imageSmoothingQuality: 'high',
        }).toDataURL('image/jpeg', 0.92)
        onCropped?.(croppedDataUrl)
    }

    if (!image) return null

    return (
        <Paper variant="outlined" sx={{ width: '100%', maxWidth: 520, mx: 'auto', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>Adjust your photo</Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Drag to move it, use the slider to zoom.</Typography>
            </Box>

            {/* The crop area: dark, with a round frame (the photo shows as a circle). */}
            <Box
                sx={{
                    bgcolor: '#111827',
                    '& .cropper-modal': { bgcolor: '#111827', opacity: 0.7 },
                    '& .cropper-view-box': { borderRadius: '50%', outline: '2px solid #fff', outlineColor: 'rgba(255,255,255,0.9)' },
                    '& .cropper-face': { borderRadius: '50%', bgcolor: 'transparent' },
                    '& .cropper-line, & .cropper-point, & .cropper-center, & .cropper-dashed': { display: 'none' },
                    '& .cropper-move': { cursor: 'grab' },
                    '& .cropper-container:active .cropper-move': { cursor: 'grabbing' },
                }}
            >
                <Cropper
                    src={image}
                    style={{ height: 320, width: '100%' }}
                    aspectRatio={1}
                    viewMode={1}
                    dragMode="move"
                    autoCropArea={0.82}
                    cropBoxMovable={false}
                    cropBoxResizable={false}
                    toggleDragModeOnDblclick={false}
                    background={false}
                    guides={false}
                    center={false}
                    highlight={false}
                    zoomOnWheel
                    wheelZoomRatio={0.1}
                    preview=".profile-crop-preview"
                    ready={fit}
                    zoom={onZoom}
                    ref={cropperRef}
                />
            </Box>

            <Stack direction="row" sx={{ alignItems: 'center', gap: 2, px: 2.5, pt: 2 }}>
                {/* Live result */}
                <Box
                    className="profile-crop-preview"
                    aria-label="Preview"
                    sx={{ width: 56, height: 56, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', border: 1, borderColor: 'divider', bgcolor: 'grey.100' }}
                />
                <Stack direction="row" sx={{ flex: 1, alignItems: 'center', gap: 1.5, color: 'text.secondary', minWidth: 0 }}>
                    <ZoomOut size={18} style={{ flexShrink: 0 }} />
                    <Slider
                        size="small"
                        aria-label="Zoom"
                        min={range.min}
                        max={range.max}
                        step={(range.max - range.min) / 200 || 0.01}
                        value={zoom}
                        onChange={(_, v) => zoomTo(v)}
                    />
                    <ZoomIn size={18} style={{ flexShrink: 0 }} />
                </Stack>
                <Tooltip title="Rotate">
                    <IconButton size="small" aria-label="Rotate" onClick={rotate}>
                        <RotateCw size={18} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Reset">
                    <IconButton size="small" aria-label="Reset" onClick={reset}>
                        <Undo2 size={18} />
                    </IconButton>
                </Tooltip>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1, px: 2.5, py: 2 }}>
                <Button variant="text" onClick={discard} sx={{ textTransform: 'none', color: 'text.secondary' }}>
                    Cancel
                </Button>
                <Button variant="contained" disableElevation onClick={handleCrop} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 2.5 }}>
                    Use Photo
                </Button>
            </Stack>
        </Paper>
    )
}

export default ImageCropper
