import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import api from '../../api/client';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';
import SectionCard from '../../components/SectionCard';
import StatsGrid from '../../components/StatsGrid';
import { reportIntervals } from '../../constants/options';
import { useToast } from '../../context/ToastContext';
import { palette } from '../../theme/colors';
import { formatINR } from '../../utils/currency';

const formatDateInput = (value) => {
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const getPresetRange = (preset) => {
  const now = new Date();
  const end = formatDateInput(now);

  if (preset === 'today') {
    return { from: end, to: end };
  }

  const days = preset === 'last7' ? 7 : preset === 'last90' ? 90 : 30;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  return {
    from: formatDateInput(startDate),
    to: end
  };
};

const AdminReportsScreen = () => {
  const { showToast } = useToast();
  const [preset, setPreset] = useState('last30');
  const [fromDate, setFromDate] = useState(() => getPresetRange('last30').from);
  const [toDate, setToDate] = useState(() => getPresetRange('last30').to);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [intervalFilter, setIntervalFilter] = useState('day');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async (filters = {}) => {
    setLoading(true);
    try {
      const params = {
        status: filters.status ?? statusFilter,
        paymentMethod: filters.paymentMethod ?? paymentFilter,
        interval: filters.interval ?? intervalFilter
      };

      const from = filters.fromDateValue ?? fromDate;
      const to = filters.toDateValue ?? toDate;
      if (from) {
        params.from = from;
      }
      if (to) {
        params.to = to;
      }

      const { data } = await api.get('/orders/reports/summary', {
        params,
        showSuccessToast: false,
        showErrorToast: false
      });

      setReportData(data);
    } catch (error) {
      setReportData(null);
      showToast(error?.response?.data?.message || error.message || 'Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = reportData?.totals || {};

  const stats = useMemo(
    () => [
      { label: 'Total Orders', value: String(totals.totalOrders || 0) },
      { label: 'Gross Revenue', value: formatINR(totals.grossRevenue || 0) },
      { label: 'Net Revenue', value: formatINR(totals.netRevenue || 0) },
      { label: 'Net P/L', value: formatINR(totals.netProfitLoss || 0) },
      { label: 'Pipeline Revenue', value: formatINR(totals.pipelineRevenue || 0) },
      { label: 'Cancelled Revenue', value: formatINR(totals.cancelledRevenue || 0) },
      { label: 'Average Order', value: formatINR(totals.averageOrderValue || 0) },
      { label: 'Cancellation Rate', value: `${Number(totals.cancellationRate || 0).toFixed(2)}%` }
    ],
    [totals]
  );

  const onPresetSelect = (value) => {
    setPreset(value);
    const range = getPresetRange(value);
    setFromDate(range.from);
    setToDate(range.to);
    void fetchReport({ fromDateValue: range.from, toDateValue: range.to });
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Dashboard" title="Reports" subtitle="Sales, profitability and status distribution for selected date range." />

      <SectionCard>
        <Text style={styles.sectionTitle}>Filters</Text>
        <View style={styles.wrapButtons}>
          {['today', 'last7', 'last30', 'last90'].map((option) => (
            <AppButton key={option} variant={preset === option ? 'primary' : 'ghost'} onPress={() => onPresetSelect(option)}>
              {option}
            </AppButton>
          ))}
        </View>

        <View style={styles.row2}>
          <AppInput style={styles.flex} label="From (YYYY-MM-DD)" value={fromDate} onChangeText={setFromDate} />
          <AppInput style={styles.flex} label="To (YYYY-MM-DD)" value={toDate} onChangeText={setToDate} />
        </View>
        <View style={styles.row2}>
          <AppInput style={styles.flex} label="Status" value={statusFilter} onChangeText={setStatusFilter} placeholder="all" />
          <AppInput style={styles.flex} label="Payment Method" value={paymentFilter} onChangeText={setPaymentFilter} placeholder="all" />
        </View>

        <View style={styles.wrapButtons}>
          {reportIntervals.map((interval) => (
            <AppButton key={interval} variant={intervalFilter === interval ? 'secondary' : 'ghost'} onPress={() => setIntervalFilter(interval)}>
              {interval}
            </AppButton>
          ))}
        </View>

        <AppButton onPress={() => fetchReport()}>Apply Report Filters</AppButton>
      </SectionCard>

      {loading ? <LoadingView message="Building report..." /> : null}
      {!loading && !reportData ? <EmptyState title="No report data" message="Try changing filters and run again." /> : null}

      {!loading && reportData ? (
        <>
          <SectionCard>
            <Text style={styles.sectionTitle}>Summary</Text>
            <StatsGrid items={stats} />
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>Status Breakdown</Text>
            {(Array.isArray(reportData.statusBreakdown) ? reportData.statusBreakdown : []).map((entry) => (
              <View key={entry.status} style={styles.dataRow}>
                <Text style={styles.dataLabel}>{entry.status}</Text>
                <Text style={styles.dataValue}>{entry.count} orders</Text>
                <Text style={styles.dataValue}>{formatINR(entry.revenue || 0)}</Text>
              </View>
            ))}
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>Top Products by Profit</Text>
            {(Array.isArray(reportData.topProducts) ? reportData.topProducts : []).length === 0 ? (
              <Text style={styles.muted}>No product data in selected range.</Text>
            ) : (
              (reportData.topProducts || []).map((entry) => (
                <View key={`${entry.productId}-${entry.name}`} style={styles.dataRow}>
                  <Text style={styles.dataLabel}>{entry.name}</Text>
                  <Text style={styles.dataValue}>Units: {entry.units}</Text>
                  <Text style={styles.dataValue}>P/L: {formatINR(entry.profitLoss || 0)}</Text>
                </View>
              ))
            )}
          </SectionCard>
        </>
      ) : null}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  wrapButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  row2: {
    flexDirection: 'row',
    gap: 8
  },
  flex: {
    flex: 1
  },
  dataRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#edf1f5',
    paddingBottom: 8,
    marginBottom: 8,
    gap: 2
  },
  dataLabel: {
    color: palette.textPrimary,
    fontWeight: '700'
  },
  dataValue: {
    color: palette.textSecondary,
    fontSize: 12
  },
  muted: {
    color: palette.textSecondary,
    fontSize: 13
  }
});

export default AdminReportsScreen;
