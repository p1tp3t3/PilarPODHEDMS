import * as React from 'react';
import Box from '@mui/material/Box';
import { DataGrid, GridActionsCellItem } from '@/Components/other/data-grid';
import { useMovieData } from '@mui/x-data-grid-generator';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

const VISIBLE_FIELDS = ['title', 'company', 'director', 'year', 'cinematicUniverse'];

// Example custom component for the title
function TitleCell({ title }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip label="🎬" size="small" />
      <Typography variant="body2">{title}</Typography>
    </Box>
  );
}

export default function QuickFilteringGrid() {
  const data = useMovieData();

  const columns = React.useMemo(() => {
    const visibleColumns = data.columns
      .filter((column) => VISIBLE_FIELDS.includes(column.field))
      .map((column) => {
        if (column.field === 'title') {
          return {
            ...column,
            renderCell: (params) => <TitleCell title={params.value} />,
          };
        }
        return column;
      });

    // Add actions column
    visibleColumns.push({
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => alert(`Editing ${params.row.title}`)}
          showInMenu={false}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => alert(`Deleting ${params.row.title}`)}
          showInMenu={false}
        />,
      ],
    });

    return visibleColumns;
  }, [data.columns]);

  return (
    <Box sx={{ height: 400, width: 1 }}>
      <DataGrid
        {...data}
        disableColumnFilter
        disableColumnSelector
        disableDensitySelector
        columns={columns}
        showToolbar
      />
    </Box>
  );
}
