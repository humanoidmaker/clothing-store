import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
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
import PageHeader from '../components/PageHeader';
import api from '../api';
import { formatINR } from '../utils/currency';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
];

const intervalOptions = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' }
];

const datePresetOptions = [
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' }
];

const statusColorMap = {
  pending: 'warning',
  processing: 'info',
  paid: 'success',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error'
};

const numberFormatter = new Intl.NumberFormat('en-IN');

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetRange = (preset) => {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (preset === 'all') {
    return { from: '', to: '' };
  }

  if (preset === 'last7') {
    start.setDate(end.getDate() - 6);
  } else if (preset === 'last30') {
    start.setDate(end.getDate() - 29);
  } else if (preset === 'last90') {
    start.setDate(end.getDate() - 89);
  } else if (preset === 'thisMonth') {
    start.setDate(1);
  }

  return { from: toInputDate(start), to: toInputDate(end) };
};

const formatNumber = (value) => numberFormatter.format(Number(value || 0));

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const getStatusLabel = (status) => `${status.charAt(0).toUpperCase()}${status.slice(1)}`;

const AdminReportsPage = () => {
  const [preset, setPreset] = useState('last30');
  const [fromDate, setFromDate] = useState(() => getPresetRange('last30').from);
  const [toDate, setToDate] = useState(() => getPresetRange('last30').to);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [intervalFilter, setIntervalFilter] = useState('day');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (preset === 'custom') {
      return;
    }

    const nextRange = getPresetRange(preset);
    setFromDate(nextRange.from);
    setToDate(nextRange.to);
  }, [preset]);

  const loadReports = async ({
    fromDateValue = fromDate,
    toDateValue = toDate,
    statusValue = statusFilter,
    paymentValue = paymentFilter,
    intervalValue = intervalFilter
  } = {}) => {
    setLoading(true);
    setError('');

    try {
      const params = {
        status: statusValue,
        paymentMethod: paymentValue,
        interval: intervalValue
      };

      if (fromDateValue) {
        params.from = fromDateValue;
      }
      if (toDateValue) {
        params.to = toDateValue;
      }

      const { data } = await api.get('/orders/reports/summary', { params });
      setReportData(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const paymentOptions = useMemo(() => {
    const staticOptions = ['all', 'Cash on Delivery', 'Razorpay'];
    const dynamicOptions = (reportData?.paymentBreakdown || []).map((entry) => entry.paymentMethod);
    return [...new Set([...staticOptions, ...dynamicOptions])];
  }, [reportData]);

  const totals = reportData?.totals;
  const trendSeries = reportData?.trend || [];
  const statusBreakdown = reportData?.statusBreakdown || [];
  const paymentBreakdown = reportData?.paymentBreakdown || [];
  const topProducts = reportData?.topProducts || [];

  const kpis = useMemo(() => {
    if (!totals) {
      return [];
    }

    return [
      {
        title: 'Profit Revenue',
        value: formatINR(totals.profitRevenue),
        helper: 'Paid, shipped and delivered orders',
        color: 'success.main'
      },
      {
        title: 'Loss Revenue',
        value: formatINR(totals.lossRevenue),
        helper: 'Cancelled order value',
        color: 'error.main'
      },
      {
        title: 'Net P/L',
        value: formatINR(totals.netProfitLoss),
        helper: 'Profit revenue minus loss revenue',
        color: totals.netProfitLoss >= 0 ? 'success.main' : 'error.main'
      },
      {
        title: 'Gross Revenue',
        value: formatINR(totals.grossRevenue),
        helper: 'All order values before cancellations',
        color: 'primary.main'
      },
      {
        title: 'Total Orders',
        value: formatNumber(totals.totalOrders),
        helper: `AOV ${formatINR(totals.averageOrderValue)}`,
        color: 'text.primary'
      },
      {
        title: 'Units Sold',
        value: formatNumber(totals.soldUnits),
        helper: `Total units ${formatNumber(totals.totalUnits)}`,
        color: 'text.primary'
      },
      {
        title: 'Pipeline Revenue',
        value: formatINR(totals.pipelineRevenue),
        helper: 'Pending + processing',
        color: 'warning.main'
      },
      {
        title: 'Cancellation Rate',
        value: formatPercent(totals.cancellationRate),
        helper: `${formatNumber(totals.cancelledUnits)} cancelled units`,
        color: 'text.primary'
      }
    ];
  }, [totals]);

  const maxTrendValue = useMemo(() => {
    return trendSeries.reduce((maxValue, entry) => {
      return Math.max(maxValue, Number(entry.profit || 0), Number(entry.loss || 0), Number(entry.revenue || 0));
    }, 1);
  }, [trendSeries]);

  const maxTopRevenue = useMemo(() => {
    return topProducts.reduce((maxValue, product) => Math.max(maxValue, Number(product.revenue || 0)), 1);
  }, [topProducts]);

  const onApplyFilters = () => {
    void loadReports();
  };

  const onResetFilters = () => {
    const range = getPresetRange('last30');
    setPreset('last30');
    setFromDate(range.from);
    setToDate(range.to);
    setStatusFilter('all');
    setPaymentFilter('all');
    setIntervalFilter('day');
    void loadReports({
      fromDateValue: range.from,
      toDateValue: range.to,
      statusValue: 'all',
      paymentValue: 'all',
      intervalValue: 'day'
    });
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Business Reports Dashboard"
        subtitle="Track operational profit/loss, sales trends, order status health and top-selling products using report filters."
        actions={(
          <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
            <Chip size="small" color="success" label={`Profit: ${formatINR(totals?.profitRevenue)}`} />
            <Chip size="small" color="error" label={`Loss: ${formatINR(totals?.lossRevenue)}`} />
            <Chip size="small" color="primary" label={`Orders: ${formatNumber(totals?.totalOrders)}`} />
          </Stack>
        )}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 1.1 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 1.2 }}>
        <CardContent sx={{ p: 1 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Report Filters</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={0.8}>
              <TextField
                select
                size="small"
                label="Date range"
                value={preset}
                onChange={(event) => setPreset(event.target.value)}
                sx={{ minWidth: 170 }}
              >
                {datePresetOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                type="date"
                size="small"
                label="From"
                value={fromDate}
                onChange={(event) => {
                  setPreset('custom');
                  setFromDate(event.target.value);
                }}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                type="date"
                size="small"
                label="To"
                value={toDate}
                onChange={(event) => {
                  setPreset('custom');
                  setToDate(event.target.value);
                }}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                select
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                sx={{ minWidth: 150 }}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Payment method"
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                sx={{ minWidth: 190 }}
              >
                {paymentOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option === 'all' ? 'All methods' : option}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Trend grouping"
                value={intervalFilter}
                onChange={(event) => setIntervalFilter(event.target.value)}
                sx={{ minWidth: 150 }}
              >
                {intervalOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction="row" spacing={0.8}>
              <Button variant="contained" onClick={onApplyFilters} disabled={loading}>
                Apply Filters
              </Button>
              <Button variant="outlined" onClick={onResetFilters} disabled={loading}>
                Reset
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading && (
        <Card sx={{ mb: 1.2 }}>
          <CardContent sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </CardContent>
        </Card>
      )}

      {!loading && reportData && (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))'
              },
              mb: 1.2
            }}
          >
            {kpis.map((kpi) => (
              <Card key={kpi.title}>
                <CardContent sx={{ p: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {kpi.title}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 0.2, color: kpi.color }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {kpi.helper}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
              mb: 1.2
            }}
          >
            <Card>
              <CardContent sx={{ p: 1 }}>
                <Typography variant="subtitle2">Profit vs Loss Trend</Typography>
                <Typography variant="caption" color="text.secondary">
                  Green bars represent profit revenue and red bars represent loss revenue.
                </Typography>
                <Divider sx={{ my: 0.8 }} />

                {trendSeries.length === 0 ? (
                  <Alert severity="info">No trend data found for this filter range.</Alert>
                ) : (
                  <Box sx={{ display: 'flex', gap: 0.7, alignItems: 'flex-end', overflowX: 'auto', pb: 0.4 }}>
                    {trendSeries.map((entry) => {
                      const profitHeight = entry.profit > 0 ? Math.max((entry.profit / maxTrendValue) * 100, 5) : 0;
                      const lossHeight = entry.loss > 0 ? Math.max((entry.loss / maxTrendValue) * 100, 5) : 0;

                      return (
                        <Stack key={entry.key} sx={{ minWidth: 70 }} spacing={0.45}>
                          <Box sx={{ height: 165, display: 'flex', alignItems: 'flex-end', gap: 0.35 }}>
                            <Box
                              sx={{
                                flex: 1,
                                height: `${profitHeight}%`,
                                backgroundColor: 'success.main',
                                borderRadius: 0.9
                              }}
                              title={`Profit ${formatINR(entry.profit)}`}
                            />
                            <Box
                              sx={{
                                flex: 1,
                                height: `${lossHeight}%`,
                                backgroundColor: 'error.main',
                                borderRadius: 0.9,
                                opacity: 0.9
                              }}
                              title={`Loss ${formatINR(entry.loss)}`}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ textAlign: 'center' }}>
                            {entry.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                            {formatINR(entry.netProfitLoss)}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Box>
                )}

                <Stack direction="row" spacing={0.7} sx={{ mt: 0.9 }}>
                  <Chip label="Profit" color="success" size="small" />
                  <Chip label="Loss" color="error" size="small" />
                </Stack>
              </CardContent>
            </Card>

            <Stack spacing={1}>
              <Card>
                <CardContent sx={{ p: 1 }}>
                  <Typography variant="subtitle2">Order Status Report</Typography>
                  <Divider sx={{ my: 0.8 }} />
                  <Stack spacing={0.8}>
                    {statusBreakdown.map((entry) => {
                      const percent = totals.totalOrders > 0 ? (entry.count / totals.totalOrders) * 100 : 0;
                      return (
                        <Box key={entry.status}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption">{getStatusLabel(entry.status)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {entry.count} ({formatPercent(percent)})
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, percent)}
                            color={statusColorMap[entry.status] || 'primary'}
                            sx={{ height: 6, borderRadius: 999, mt: 0.3, mb: 0.2 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatINR(entry.revenue)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: 1 }}>
                  <Typography variant="subtitle2">Payment Method Report</Typography>
                  <Divider sx={{ my: 0.8 }} />
                  {paymentBreakdown.length === 0 ? (
                    <Alert severity="info">No payment data in this range.</Alert>
                  ) : (
                    <Stack spacing={0.8}>
                      {paymentBreakdown.map((entry) => {
                        const percent = totals.grossRevenue > 0 ? (entry.revenue / totals.grossRevenue) * 100 : 0;
                        return (
                          <Box key={entry.paymentMethod}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption">{entry.paymentMethod}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {entry.count} orders
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, percent)}
                              sx={{ height: 6, borderRadius: 999, mt: 0.3, mb: 0.2 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {formatINR(entry.revenue)} ({formatPercent(percent)})
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Box>

          <Card>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="subtitle2">Top Product Performance</Typography>
              <Typography variant="caption" color="text.secondary">
                Revenue excludes cancelled orders and loss columns show cancelled impact by product.
              </Typography>
              <Divider sx={{ my: 0.8 }} />

              {topProducts.length === 0 ? (
                <Alert severity="info">No product-level sales found for the selected filters.</Alert>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Units</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell>Revenue Share</TableCell>
                        <TableCell align="right">Cancelled Units</TableCell>
                        <TableCell align="right">Cancelled Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topProducts.map((product) => {
                        const share = maxTopRevenue > 0 ? (product.revenue / maxTopRevenue) * 100 : 0;
                        return (
                          <TableRow key={`${product.productId || product.name}`}>
                            <TableCell>
                              <Typography variant="body2">{product.name}</Typography>
                            </TableCell>
                            <TableCell align="right">{formatNumber(product.units)}</TableCell>
                            <TableCell align="right">{formatINR(product.revenue)}</TableCell>
                            <TableCell sx={{ minWidth: 170 }}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(100, share)}
                                color="success"
                                sx={{ height: 6, borderRadius: 999, mb: 0.25 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {formatPercent(share)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{formatNumber(product.cancelledUnits)}</TableCell>
                            <TableCell align="right">{formatINR(product.cancelledRevenue)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default AdminReportsPage;
