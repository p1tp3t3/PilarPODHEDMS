import ListSkeleton from "../reload/list-skeleton";
import { ReportArchiveService } from "@/others/services/report-archive-service";
import { readableDate, readableTime, toTitleCase } from "@/others/function";
import { useState, memo, useEffect } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { MuiListEmpty } from "./mui-list-parts";

// A student's violations, each an MUI accordion opening onto its incidents.
const IncidentGroupList = ({ user_id, list: listProp = null }) => {
  const [list, setList] = useState(listProp ?? []);
  const [loading, setLoading] = useState(listProp == null);

  useEffect(() => {
    // The profile controller now passes the incident groups down as a
    // prop; only fall back to the (legacy) API call when none is given.
    if (listProp != null) {
      setList(listProp);
      setLoading(false);
      return;
    }

    let cancelled = false;

    ReportArchiveService.getStudentIncidentGroups(user_id, (data) => {
      if (cancelled) return;
      setList(Array.isArray(data) ? data : []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user_id, listProp]);

  if (loading) return <ListSkeleton rows={4} avatar={false} />;
  if (!Array.isArray(list) || list.length === 0) {
    return <MuiListEmpty icon={TriangleAlert} title="No violations found." />;
  }

  return (
    <Box sx={{ width: "100%" }}>
      {list.map((group) => <Group key={group.violation_id} data={group} />)}
    </Box>
  );
};

const Group = memo(({ data }) => {
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];

  return (
    <Accordion
      disableGutters
      variant="outlined"
      sx={{ mb: 1.25, borderRadius: "10px !important", overflow: "hidden", "&::before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ChevronDown size={18} />}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }}>{data?.violation_name ?? "—"}</Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
            {incidents.length} incident{incidents.length === 1 ? "" : "s"}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: "action.hover", p: 1.25 }}>
        {incidents.length === 0 ? (
          <Typography sx={{ p: 1, fontSize: "0.85rem", color: "text.secondary" }}>No incidents.</Typography>
        ) : (
          <Stack spacing={1}>
            {incidents.map((incident) => (
              <Card key={incident.complaint_subject_id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, display: "grid", gap: 0.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1.5 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>Case No. {incident.case_number}</Typography>
                    <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                      {incident.created_at ? new Date(String(incident.created_at).replace(" ", "T")).toLocaleString() : ""}
                    </Typography>
                  </Box>

                  {incident?.reference_number && (
                    <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                      Reference No.: <b>{incident.reference_number}</b>
                    </Typography>
                  )}
                  {incident?.incident && (
                    <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                      Incident Reported: <b>{incident.incident}</b>
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                    Resolved Since: {readableDate(incident?.resolved_since)} ({readableTime(incident?.resolved_since)})
                  </Typography>

                  {/* Only sent to the prefect. */}
                  {incident?.summary && (
                    <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                      Prefect's Remark: {toTitleCase(incident.summary)}
                    </Typography>
                  )}

                  {Array.isArray(incident.offenses) && incident.offenses.length > 0 && (
                    <Box sx={{ mt: 0.75 }}>
                      <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", mb: 0.5 }}>Violations</Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {incident.offenses.map((offense) => (
                          <Chip key={offense.id} size="small" variant="outlined"
                            label={offense.name ? toTitleCase(offense.name) : "Unknown Violation"} />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
});

export default IncidentGroupList;
