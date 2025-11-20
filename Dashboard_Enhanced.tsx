import React, { useState, useMemo } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Paper,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  Inventory as InventoryIcon,
  AttachMoney as FinanceIcon,
  Build as MaintenanceIcon,
  TrendingDown as DepreciationIcon,
  Security as InsuranceIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  LocationOn as LocationIcon,
  Category as CategoryIcon,
  Assignment as AssignmentIcon,
  Description as DocumentIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { assetAPI, api } from '../services/api';
import { documentsAPI } from '../services/api/documents';
import { useQuery } from '@tanstack/react-query';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color = 'primary', onClick }) => (
  <Card
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': onClick ? {
        transform: 'translateY(-4px)',
        boxShadow: 3,
      } : {},
      height: '100%',
    }}
    onClick={onClick}
  >
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ my: 1, fontWeight: 600 }}>
            {value}
          </Typography>
          {trend && (
            <Box display="flex" alignItems="center" gap={0.5}>
              {trend.isPositive ? (
                <ArrowUpwardIcon fontSize="small" color="success" />
              ) : (
                <ArrowDownwardIcon fontSize="small" color="error" />
              )}
              <Typography
                variant="caption"
                color={trend.isPositive ? 'success.main' : 'error.main'}
              >
                {Math.abs(trend.value)}%
              </Typography>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const ComprehensiveDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Fetch all required data
  const { data: assetsResponse, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['allAssets'],
    queryFn: async () => {
      const response = await assetAPI.getAssets();
      return response.data;
    },
  });

  // Fetch maintenance data
  const { data: maintenanceData, isLoading: isLoadingMaintenance } = useQuery({
    queryKey: ['allMaintenance'],
    queryFn: async () => {
      try {
        const response = await api.get('/maintenance/');
        return response.data.results || response.data || [];
      } catch (error) {
        console.error('Error fetching maintenance:', error);
        return [];
      }
    },
  });

  // Fetch inventory data
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventorySummary'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory-items/');
        return response.data.results || response.data || [];
      } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
      }
    },
  });

  // Fetch insurance data
  const { data: insuranceData, isLoading: isLoadingInsurance } = useQuery({
    queryKey: ['insurancePolicies'],
    queryFn: async () => {
      try {
        const response = await api.get('/insurance-policies/');
        return response.data.results || response.data || [];
      } catch (error) {
        console.error('Error fetching insurance:', error);
        return [];
      }
    },
  });

  // Fetch locations
  const { data: locationsData, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await assetAPI.getLocations();
      return response.data.results || response.data || [];
    },
  });

  // Fetch documents
  const { data: documentsData, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await documentsAPI.getAllDocuments();
      return response.data;
    },
  });

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    if (!assetsResponse?.results) return null;

    const assets = assetsResponse.results;
    const totalAssets = assets.length;
    const totalValue = assets.reduce((sum: number, asset: any) => sum + (Number(asset.current_value) || 0), 0);
    const purchaseValue = assets.reduce((sum: number, asset: any) => sum + (Number(asset.purchase_cost) || 0), 0);

    // Asset Status Distribution
    const statusDistribution = assets.reduce((acc: any, asset: any) => {
      const status = asset.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const activeAssets = statusDistribution['ACTIVE'] || 0;
    const maintenanceAssets = statusDistribution['REPAIR'] || statusDistribution['MAINTENANCE'] || 0;

    // Category Distribution
    const categoryDistribution = assets.reduce((acc: any[], asset: any) => {
      const categoryName = asset.category_name || asset.category || 'Uncategorized';
      const existing = acc.find(item => item.name === categoryName);
      if (existing) {
        existing.value += 1;
        existing.totalValue += Number(asset.current_value) || 0;
      } else {
        acc.push({
          name: categoryName,
          value: 1,
          totalValue: Number(asset.current_value) || 0,
        });
      }
      return acc;
    }, []);

    // Depreciation metrics
    const totalDepreciation = purchaseValue - totalValue;
    const avgDepreciationRate = purchaseValue > 0 ? ((totalDepreciation / purchaseValue) * 100) : 0;

    // Warranty metrics
    const today = new Date();
    const assetsWithWarranty = assets.filter((asset: any) => asset.warranty_expiry);
    const expiredWarranties = assetsWithWarranty.filter((asset: any) =>
      new Date(asset.warranty_expiry) < today
    ).length;
    const activeWarranties = assetsWithWarranty.length - expiredWarranties;
    const expiringS oon = assetsWithWarranty.filter((asset: any) => {
      const expiryDate = new Date(asset.warranty_expiry);
      const daysUntilExpiry = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).length;

    return {
      totalAssets,
      totalValue,
      purchaseValue,
      activeAssets,
      maintenanceAssets,
      totalDepreciation,
      avgDepreciationRate,
      categoryDistribution,
      statusDistribution,
      warranties: {
        total: assetsWithWarranty.length,
        active: activeWarranties,
        expired: expiredWarranties,
        expiringSoon,
      },
    };
  }, [assetsResponse]);

  // Maintenance metrics
  const maintenanceMetrics = useMemo(() => {
    if (!maintenanceData) return null;

    const pending = maintenanceData.filter((m: any) => m.status === 'PENDING' || m.status === 'SCHEDULED').length;
    const inProgress = maintenanceData.filter((m: any) => m.status === 'IN_PROGRESS').length;
    const completed = maintenanceData.filter((m: any) => m.status === 'COMPLETED').length;
    const overdue = maintenanceData.filter((m: any) => {
      if (m.status === 'COMPLETED') return false;
      const dueDate = new Date(m.scheduled_date || m.start_date);
      return dueDate < new Date();
    }).length;

    const totalCost = maintenanceData
      .filter((m: any) => m.status === 'COMPLETED')
      .reduce((sum: number, m: any) => sum + (Number(m.cost) || 0), 0);

    return {
      total: maintenanceData.length,
      pending,
      inProgress,
      completed,
      overdue,
      totalCost,
    };
  }, [maintenanceData]);

  // Inventory metrics
  const inventoryMetrics = useMemo(() => {
    if (!inventoryData) return null;

    const totalItems = inventoryData.length;
    const lowStockItems = inventoryData.filter((item: any) => {
      const stock = Number(item.current_stock) || 0;
      const reorder = Number(item.reorder_level) || 0;
      return stock < reorder;
    }).length;

    const criticalItems = inventoryData.filter((item: any) => {
      const stock = Number(item.current_stock) || 0;
      const minimum = Number(item.minimum_level) || 0;
      return stock <= minimum;
    }).length;

    const totalValue = inventoryData.reduce((sum: number, item: any) => {
      const stock = Number(item.current_stock) || 0;
      const cost = Number(item.unit_cost) || 0;
      return sum + (stock * cost);
    }, 0);

    return {
      totalItems,
      lowStockItems,
      criticalItems,
      totalValue,
    };
  }, [inventoryData]);

  // Insurance metrics
  const insuranceMetrics = useMemo(() => {
    if (!insuranceData) return null;

    const activePolicies = insuranceData.filter((p: any) => p.status === 'ACTIVE').length;
    const expiredPolicies = insuranceData.filter((p: any) => p.status === 'EXPIRED').length;
    const totalPremium = insuranceData
      .filter((p: any) => p.status === 'ACTIVE')
      .reduce((sum: number, p: any) => sum + (Number(p.premium) || 0), 0);
    const totalCoverage = insuranceData
      .filter((p: any) => p.status === 'ACTIVE')
      .reduce((sum: number, p: any) => sum + (Number(p.coverage_amount) || 0), 0);

    return {
      total: insuranceData.length,
      active: activePolicies,
      expired: expiredPolicies,
      totalPremium,
      totalCoverage,
    };
  }, [insuranceData]);

  // Recent activities and alerts
  const alerts = useMemo(() => {
    const alertList: any[] = [];

    if (metrics?.warranties.expiringSoon > 0) {
      alertList.push({
        type: 'warning',
        message: `${metrics.warranties.expiringSoon} warranties expiring within 30 days`,
        action: () => navigate('/assets'),
      });
    }

    if (metrics?.warranties.expired > 0) {
      alertList.push({
        type: 'error',
        message: `${metrics.warranties.expired} warranties have expired`,
        action: () => navigate('/assets'),
      });
    }

    if (maintenanceMetrics?.overdue > 0) {
      alertList.push({
        type: 'error',
        message: `${maintenanceMetrics.overdue} overdue maintenance tasks`,
        action: () => navigate('/maintenance'),
      });
    }

    if (inventoryMetrics?.criticalItems > 0) {
      alertList.push({
        type: 'error',
        message: `${inventoryMetrics.criticalItems} inventory items at critical level`,
        action: () => navigate('/inventory'),
      });
    }

    if (inventoryMetrics?.lowStockItems > 0) {
      alertList.push({
        type: 'warning',
        message: `${inventoryMetrics.lowStockItems} inventory items need reordering`,
        action: () => navigate('/inventory'),
      });
    }

    if (insuranceMetrics?.expired > 0) {
      alertList.push({
        type: 'warning',
        message: `${insuranceMetrics.expired} expired insurance policies`,
        action: () => navigate('/insurance'),
      });
    }

    return alertList;
  }, [metrics, maintenanceMetrics, inventoryMetrics, insuranceMetrics, navigate]);

  const isLoading = isLoadingAssets || isLoadingMaintenance || isLoadingInventory || isLoadingInsurance;

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Asset Management Dashboard
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<InventoryIcon />}
          onClick={() => navigate('/assets/new')}
        >
          Add Asset
        </Button>
      </Box>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="warning" />
                  Alerts & Notifications
                </Typography>
                <List dense>
                  {alerts.slice(0, 5).map((alert, index) => (
                    <ListItem
                      key={index}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={alert.action}
                    >
                      <ListItemIcon>
                        {alert.type === 'error' ? (
                          <ErrorIcon color="error" />
                        ) : (
                          <WarningIcon color="warning" />
                        )}
                      </ListItemIcon>
                      <ListItemText primary={alert.message} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Assets"
            value={metrics?.totalAssets || 0}
            icon={<InventoryIcon color="primary" />}
            color="primary"
            onClick={() => navigate('/assets')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Value"
            value={`$${(metrics?.totalValue || 0).toLocaleString()}`}
            icon={<FinanceIcon color="success" />}
            color="success"
            trend={{
              value: 5.2,
              isPositive: false,
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Maintenance"
            value={maintenanceMetrics?.pending || 0}
            icon={<MaintenanceIcon color="warning" />}
            color="warning"
            onClick={() => navigate('/maintenance')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Warranties"
            value={metrics?.warranties.active || 0}
            icon={<CheckCircleIcon color="success" />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Secondary Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg Depreciation"
            value={`${(metrics?.avgDepreciationRate || 0).toFixed(1)}%`}
            icon={<DepreciationIcon color="error" />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Insurance Policies"
            value={insuranceMetrics?.active || 0}
            icon={<InsuranceIcon color="primary" />}
            color="primary"
            onClick={() => navigate('/insurance')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Inventory Items"
            value={inventoryMetrics?.totalItems || 0}
            icon={<CategoryIcon color="info" />}
            color="info"
            onClick={() => navigate('/inventory')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Locations"
            value={locationsData?.length || 0}
            icon={<LocationIcon color="secondary" />}
            color="secondary"
            onClick={() => navigate('/locations')}
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Asset Category Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Asset Distribution by Category
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics?.categoryDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(metrics?.categoryDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Asset Value by Category */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Asset Value by Category
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.categoryDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="totalValue" fill="#8884d8" name="Total Value" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Maintenance Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Maintenance Overview
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Pending', value: maintenanceMetrics?.pending || 0 },
                      { name: 'In Progress', value: maintenanceMetrics?.inProgress || 0 },
                      { name: 'Completed', value: maintenanceMetrics?.completed || 0 },
                      { name: 'Overdue', value: maintenanceMetrics?.overdue || 0 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="textSecondary">
                Total Maintenance Cost: ${(maintenanceMetrics?.totalCost || 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Asset Status Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Asset Status Overview
              </Typography>
              <Box sx={{ p: 2 }}>
                {Object.entries(metrics?.statusDistribution || {}).map(([status, count]: [string, any]) => (
                  <Box key={status} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2">{status}</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {count}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(count / (metrics?.totalAssets || 1)) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Summary Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Warranty Summary
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Active Warranties"
                    secondary={metrics?.warranties.active || 0}
                  />
                  <CheckCircleIcon color="success" />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Expiring Soon (30 days)"
                    secondary={metrics?.warranties.expiringSoon || 0}
                  />
                  <WarningIcon color="warning" />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Expired"
                    secondary={metrics?.warranties.expired || 0}
                  />
                  <ErrorIcon color="error" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Inventory Summary
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Total Items"
                    secondary={inventoryMetrics?.totalItems || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Low Stock"
                    secondary={inventoryMetrics?.lowStockItems || 0}
                  />
                  <WarningIcon color="warning" />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Critical Level"
                    secondary={inventoryMetrics?.criticalItems || 0}
                  />
                  <ErrorIcon color="error" />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Total Value"
                    secondary={`$${(inventoryMetrics?.totalValue || 0).toLocaleString()}`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Insurance Summary
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Active Policies"
                    secondary={insuranceMetrics?.active || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Total Premium (Annual)"
                    secondary={`$${(insuranceMetrics?.totalPremium || 0).toLocaleString()}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Total Coverage"
                    secondary={`$${(insuranceMetrics?.totalCoverage || 0).toLocaleString()}`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ComprehensiveDashboard;
