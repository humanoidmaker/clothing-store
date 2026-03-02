import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import api from '../api';
import AdminSettingsSubnav from '../components/AdminSettingsSubnav';
import PageHeader from '../components/PageHeader';
import { formatINR } from '../utils/currency';

const defaultForm = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '10',
  minOrderAmount: '0',
  maxDiscountAmount: '0',
  startsAt: '',
  expiresAt: '',
  active: true
};

const discountTypeOptions = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'flat', label: 'Flat (INR)' }
];

const statusColorMap = {
  active: 'success',
  scheduled: 'info',
  expired: 'warning',
  inactive: 'default'
};

const formatDateTimeInput = (value) => {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const localOffsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - localOffsetMs).toISOString().slice(0, 16);
};

const formatDiscountLabel = (coupon) => {
  const type = String(coupon?.discountType || '').toLowerCase();
  const value = Number(coupon?.discountValue || 0);
  if (type === 'percentage') {
    return `${value}%`;
  }
  return formatINR(value);
};

const formatWindow = (coupon) => {
  const startsAt = coupon?.startsAt ? new Date(coupon.startsAt) : null;
  const expiresAt = coupon?.expiresAt ? new Date(coupon.expiresAt) : null;
  const startLabel = startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt.toLocaleString('en-IN') : 'Anytime';
  const endLabel = expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt.toLocaleString('en-IN') : 'No expiry';
  return `${startLabel} -> ${endLabel}`;
};

const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState('');
  const [form, setForm] = useState({ ...defaultForm });

  const fetchCoupons = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/coupons');
      const nextCoupons = Array.isArray(data?.coupons) ? data.coupons : [];
      setCoupons(nextCoupons);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCoupons();
  }, []);

  const openCreateDialog = () => {
    setEditingCouponId('');
    setForm({ ...defaultForm });
    setDialogOpen(true);
  };

  const openEditDialog = (coupon) => {
    setEditingCouponId(String(coupon?._id || ''));
    setForm({
      code: String(coupon?.code || ''),
      description: String(coupon?.description || ''),
      discountType: String(coupon?.discountType || 'percentage'),
      discountValue: String(coupon?.discountValue ?? '0'),
      minOrderAmount: String(coupon?.minOrderAmount ?? '0'),
      maxDiscountAmount: String(coupon?.maxDiscountAmount ?? '0'),
      startsAt: formatDateTimeInput(coupon?.startsAt),
      expiresAt: formatDateTimeInput(coupon?.expiresAt),
      active: Boolean(coupon?.active)
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) {
      return;
    }
    setDialogOpen(false);
    setEditingCouponId('');
    setForm({ ...defaultForm });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload = {
        code: String(form.code || '').trim().toUpperCase(),
        description: String(form.description || '').trim(),
        discountType: String(form.discountType || 'percentage'),
        discountValue: Number(form.discountValue || 0),
        minOrderAmount: Number(form.minOrderAmount || 0),
        maxDiscountAmount: Number(form.maxDiscountAmount || 0),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        active: Boolean(form.active)
      };

      if (editingCouponId) {
        await api.put(`/coupons/${editingCouponId}`, payload, { showSuccessToast: false });
        setSuccess('Coupon updated successfully');
      } else {
        await api.post('/coupons', payload, { showSuccessToast: false });
        setSuccess('Coupon created successfully');
      }

      setDialogOpen(false);
      setEditingCouponId('');
      setForm({ ...defaultForm });
      await fetchCoupons();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteCoupon = async (couponId) => {
    const confirmed = window.confirm('Delete this coupon? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    setDeletingId(couponId);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/coupons/${couponId}`, { showSuccessToast: false });
      setCoupons((current) => current.filter((coupon) => coupon._id !== couponId));
      setSuccess('Coupon deleted successfully');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to delete coupon');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Coupon Management"
        subtitle="Create and control discount coupons for checkout."
      />

      <Card sx={{ mb: 1.2 }}>
        <CardContent sx={{ p: 1 }}>
          <AdminSettingsSubnav />
        </CardContent>
      </Card>

      {(error || success) && (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      <Card sx={{ mb: 1.2 }}>
        <CardContent sx={{ p: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.8}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Coupons ({coupons.length})
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddCircleOutlineOutlinedIcon />}
              onClick={openCreateDialog}
            >
              Add Coupon
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={22} />
            </Box>
          ) : coupons.length === 0 ? (
            <Box sx={{ p: 1.2 }}>
              <Alert severity="info">No coupons configured yet.</Alert>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Discount</TableCell>
                    <TableCell>Min Order</TableCell>
                    <TableCell>Window</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Scope</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon._id}>
                      <TableCell>
                        <Stack spacing={0.2}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {coupon.code}
                          </Typography>
                          {coupon.description && (
                            <Typography variant="caption" color="text.secondary">
                              {coupon.description}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.2}>
                          <Typography variant="body2">{formatDiscountLabel(coupon)}</Typography>
                          {coupon.discountType === 'percentage' && Number(coupon.maxDiscountAmount || 0) > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              Max {formatINR(coupon.maxDiscountAmount)}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{formatINR(coupon.minOrderAmount || 0)}</TableCell>
                      <TableCell sx={{ minWidth: 250 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatWindow(coupon)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={String(coupon.status || 'inactive')}
                          color={statusColorMap[coupon.status] || 'default'}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {coupon.resellerId ? (coupon.resellerName || coupon.resellerId) : 'Global'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.3} justifyContent="flex-end">
                          <IconButton size="small" onClick={() => openEditDialog(coupon)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={deletingId === coupon._id}
                            onClick={() => onDeleteCoupon(coupon._id)}
                          >
                            {deletingId === coupon._id ? (
                              <CircularProgress size={14} />
                            ) : (
                              <DeleteOutlineOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingCouponId ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
        <DialogContent dividers>
          <Box component="form" id="coupon-form" onSubmit={onSubmit}>
            <Stack spacing={1}>
              <TextField
                required
                label="Coupon Code"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                inputProps={{ maxLength: 40 }}
                helperText="Allowed: A-Z, 0-9, underscore, hyphen"
              />

              <TextField
                label="Description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                inputProps={{ maxLength: 200 }}
              />

              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
                <TextField
                  select
                  label="Discount Type"
                  value={form.discountType}
                  onChange={(event) => setForm((current) => ({ ...current, discountType: event.target.value }))}
                >
                  {discountTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  required
                  type="number"
                  label="Discount Value"
                  inputProps={{ min: 0.01, step: 0.01 }}
                  value={form.discountValue}
                  onChange={(event) => setForm((current) => ({ ...current, discountValue: event.target.value }))}
                />
              </Box>

              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
                <TextField
                  type="number"
                  label="Minimum Order Amount (INR)"
                  inputProps={{ min: 0, step: 0.01 }}
                  value={form.minOrderAmount}
                  onChange={(event) => setForm((current) => ({ ...current, minOrderAmount: event.target.value }))}
                />
                <TextField
                  type="number"
                  label="Max Discount Amount (INR)"
                  inputProps={{ min: 0, step: 0.01 }}
                  value={form.maxDiscountAmount}
                  onChange={(event) => setForm((current) => ({ ...current, maxDiscountAmount: event.target.value }))}
                  disabled={form.discountType !== 'percentage'}
                />
              </Box>

              <Divider />

              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
                <TextField
                  label="Starts At"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Expires At"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              <TextField
                select
                label="Status"
                value={form.active ? 'active' : 'inactive'}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.target.value === 'active'
                  }))
                }
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="coupon-form"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
          >
            {saving ? 'Saving...' : editingCouponId ? 'Save Changes' : 'Create Coupon'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminCouponsPage;
