import { Link } from "@inertiajs/react"
import { Alert, Box, Button, Divider, Paper, Skeleton, Typography } from "@mui/material"
import { ArrowRight, BrainCircuit, FileSearch } from "lucide-react"
import useListData from "@/others/hooks/use-list-data"
import { readableDate, readableTime } from "@/others/function"

const TRAINING = "/super-admin/model-training"

const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`)
const when = (iso) => (iso ? `${readableDate(iso)}, ${readableTime(iso)}` : "Never")

// One figure: its label over its value.
const Figure = ({ label, value, loading }) => (
    <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{label}</Typography>
        {loading
            ? <Skeleton width="60%" height={24} />
            : <Typography noWrap sx={{ fontSize: "0.9rem", fontWeight: 600 }}>{value}</Typography>}
    </Box>
)

// One model: its name and algorithm, then its figures in two columns.
const ModelSection = ({ icon: Icon, title, subtitle, figures, loading, note }) => (
    <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.75, display: "grid", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
            <Box sx={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "var(--tone-gray-bg)", color: "var(--tone-gray-fg)" }}>
                <Icon size={17} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{title}</Typography>
                <Typography noWrap sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{subtitle}</Typography>
            </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5, pl: { sm: 5.5 } }}>
            {figures.map(([label, value]) => <Figure key={label} label={label} value={value} loading={loading} />)}
        </Box>
        {note}
    </Box>
)

// The System Admin dashboard's summary of Model Training: the violation
// predictor's and complaint analyzer's figures, from the ML service's
// status (/maintenance/models/status, as on the Model Training page).
const ModelOverviewPanel = () => {
    const { data, loading, error } = useListData("/maintenance/models/status", {})
    const p = data?.eivp
    const c = data?.cca
    const busy = loading && !data

    return (
        <Paper elevation={1} sx={{ borderRadius: "0.5rem", overflow: "hidden", minWidth: 0 }}>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.25, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1, borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography component="h2" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>Model Overview</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Machine learning models</Typography>
                </Box>
                <Button
                    component={Link}
                    href={TRAINING}
                    size="small"
                    endIcon={<ArrowRight size={15} />}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                >
                    Model Training
                </Button>
            </Box>

            {error && !data ? (
                <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Alert severity="warning" variant="outlined" sx={{ fontSize: "0.8rem" }}>
                        {error?.response?.data?.message ?? "Could not load the model status."}
                    </Alert>
                </Box>
            ) : (
                <>
                    <ModelSection
                        icon={BrainCircuit}
                        title="Early Intervention Violation Predictor"
                        subtitle={p?.algorithm ?? "Logistic Regression"}
                        loading={busy}
                        figures={[
                            ["Accuracy", pct(p?.eval?.accuracy)],
                            ["ROC AUC", p?.eval?.roc_auc != null ? p.eval.roc_auc.toFixed(3) : "—"],
                            ["Dataset Rows", p?.dataset_rows ?? "—"],
                            ["Last Trained", p ? when(p.trained_at) : "—"],
                        ]}
                    />
                    <Divider />
                    <ModelSection
                        icon={FileSearch}
                        title="Complaint Context Analyzer"
                        subtitle={c?.algorithm ?? "Word2Vec + cosine similarity"}
                        loading={busy}
                        figures={[
                            ["Embedded Violations", c ? `${c.embedded ?? 0} of ${c.violations ?? 0}` : "—"],
                            ["With Keywords", c?.with_keywords ?? "—"],
                            ["Last Rebuilt", c ? when(c.embedded_at) : "—"],
                        ]}
                        note={c?.not_embedded?.length > 0 && (
                            <Typography sx={{ fontSize: "0.72rem", color: "var(--tone-amber-fg)", pl: { sm: 5.5 } }}>
                                {c.not_embedded.length} violation{c.not_embedded.length !== 1 ? "s" : ""} not embedded (no known words).
                            </Typography>
                        )}
                    />
                </>
            )}
        </Paper>
    )
}

export default ModelOverviewPanel
