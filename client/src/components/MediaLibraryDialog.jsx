import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ProductImageViewport from './ProductImageViewport';
import api from '../api';
import { readValidatedImages, minImageDimension } from '../utils/imageUpload';

const normalizeAsset = (asset = {}) => ({
  _id: String(asset._id || ''),
  name: String(asset.name || 'Image'),
  altText: String(asset.altText || ''),
  url: String(asset.url || ''),
  mimeType: String(asset.mimeType || ''),
  source: String(asset.source || ''),
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt
});

const normalizeUrl = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    return String(value.url || '').trim();
  }

  return '';
};

const normalizeUrlList = (values) =>
  Array.isArray(values)
    ? values.map((value) => normalizeUrl(value)).filter(Boolean)
    : [];

const MediaLibraryDialog = ({
  open,
  onClose,
  title = 'Media Library',
  mode = 'single',
  selectedUrls = [],
  onSelect,
  uploadProfile = 'product'
}) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState([]);
  const [initialSelected, setInitialSelected] = useState([]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const initialSelectedSet = useMemo(() => new Set(initialSelected), [initialSelected]);

  const fetchAssets = async (queryText = '') => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/media', {
        params: queryText ? { q: queryText } : {}
      });
      setAssets(Array.isArray(data) ? data.map(normalizeAsset) : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load media library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const normalizedSelected = normalizeUrlList(selectedUrls);
    setSelected(normalizedSelected);
    setInitialSelected(normalizedSelected);
    fetchAssets();
  }, [open, selectedUrls]);

  const onSearch = async () => {
    await fetchAssets(searchText.trim());
  };

  const onSelectAsset = (asset) => {
    const url = String(asset?.url || '');
    if (!url) return;

    if (mode === 'single') {
      setSelected([url]);
      return;
    }

    setSelected((current) => {
      if (current.includes(url)) {
        if (initialSelectedSet.has(url)) {
          return current;
        }
        return current.filter((item) => item !== url);
      }
      return [...current, url];
    });
  };

  const onUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    try {
      const validated = await readValidatedImages(files, uploadProfile);
      const payload = {
        items: validated.map(({ file, dataUrl }) => ({
          name: file.name?.replace(/\.[^/.]+$/, '') || 'Image',
          url: dataUrl,
          mimeType: file.type,
          source: 'upload'
        }))
      };

      const { data } = await api.post('/media', payload);
      const created = Array.isArray(data) ? data.map(normalizeAsset) : [];
      await fetchAssets(searchText.trim());

      if (created.length > 0) {
        if (mode === 'single') {
          setSelected([created[0].url]);
        } else {
          setSelected((current) => [...new Set([...current, ...created.map((asset) => asset.url)])]);
        }
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const onEditAsset = async (asset) => {
    const nextName = window.prompt('Image name', asset.name || '');
    if (nextName === null) return;

    const nextAltText = window.prompt('Alt text', asset.altText || '');
    if (nextAltText === null) return;

    try {
      await api.put(`/media/${asset._id}`, {
        name: nextName,
        altText: nextAltText
      });
      await fetchAssets(searchText.trim());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update media');
    }
  };

  const onDeleteAsset = async (asset) => {
    const confirmed = window.confirm(`Delete media "${asset.name}"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/media/${asset._id}`);
      setSelected((current) => current.filter((url) => url !== asset.url));
      await fetchAssets(searchText.trim());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete media');
    }
  };

  const handleConfirm = () => {
    const confirmedUrls =
      mode === 'single'
        ? normalizeUrlList(selected)
        : [...new Set([...normalizeUrlList(initialSelected), ...normalizeUrlList(selected)])];

    const assetByUrl = new Map(assets.map((asset) => [asset.url, asset]));
    const selectedAssets = confirmedUrls
      .map((url) => {
        const existing = assetByUrl.get(url);
        if (existing) {
          return existing;
        }

        return normalizeAsset({
          _id: `external-${url}`,
          name: 'Image',
          altText: '',
          url,
          mimeType: '',
          source: 'existing'
        });
      })
      .filter((asset) => asset.url);
    onSelect?.(selectedAssets);
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={0.8}>
            <TextField
              size="small"
              label="Search Images"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onSearch();
                }
              }}
              fullWidth
            />
            <Button variant="outlined" onClick={onSearch} disabled={loading}>
              Search
            </Button>
            <Button component="label" variant="contained" startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <CloudUploadOutlinedIcon />} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
              <input
                hidden
                multiple
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onUpload}
              />
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Upload JPG/PNG/WEBP (min {minImageDimension}x{minImageDimension}, max 10MB each). Select {mode === 'single' ? 'one' : 'one or more'} image{mode === 'single' ? '' : 's'}.
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {selected.length > 0 ? (
            <Stack spacing={0.6}>
              <Typography variant="caption" color="text.secondary">
                Selected {selected.length} image{selected.length > 1 ? 's' : ''}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.6, overflowX: 'auto', pb: 0.3 }}>
                {selected.map((url) => (
                  <Box key={url} sx={{ width: 68, minWidth: 68 }}>
                    <ProductImageViewport src={url} alt="Selected" aspectRatio="1 / 1" fit="cover" />
                  </Box>
                ))}
              </Box>
            </Stack>
          ) : null}

          <Box
            sx={{
              display: 'grid',
              gap: 0.8,
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))'
            }}
          >
            {loading ? (
              <Box sx={{ py: 3, display: 'grid', placeItems: 'center', gridColumn: '1/-1' }}>
                <CircularProgress />
              </Box>
            ) : null}

            {!loading && assets.length === 0 ? (
              <Alert severity="info" sx={{ gridColumn: '1/-1' }}>
                No media found. Upload images to start the gallery.
              </Alert>
            ) : null}

            {!loading && assets.map((asset) => {
              const isSelected = selectedSet.has(asset.url);
              return (
                <Card
                  key={asset._id}
                  variant={isSelected ? 'elevation' : 'outlined'}
                  sx={{
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderWidth: isSelected ? 1.5 : 1
                  }}
                >
                  <CardContent sx={{ p: 0.7 }}>
                    <Stack spacing={0.5}>
                      <Box onClick={() => onSelectAsset(asset)} sx={{ cursor: 'pointer' }}>
                        <ProductImageViewport src={asset.url} alt={asset.altText || asset.name} aspectRatio="1 / 1" fit="cover" />
                      </Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap title={asset.name}>
                          {asset.name}
                        </Typography>
                        <Stack direction="row" spacing={0.2}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => onEditAsset(asset)}>
                              <EditOutlinedIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => onDeleteAsset(asset)}>
                              <DeleteOutlineOutlinedIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={isSelected ? 'Selected' : 'Select'}>
                            <IconButton size="small" color={isSelected ? 'primary' : 'default'} onClick={() => onSelectAsset(asset)}>
                              <CheckCircleOutlineOutlinedIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleConfirm} disabled={selected.length === 0}>
          Use Selected
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MediaLibraryDialog;
