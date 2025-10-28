import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/apiClient.js';
import { useToast } from './Toast.jsx';
import { useTheme } from './ThemeToggle.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import { getActiveUser } from '../getActiveUser.js';

const BusinessDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    payments: { total: 0, pending: 0, completed: 0 },
    subscriptions: { total: 0, active: 0, cancelled: 0 },
    invoices: { total: 0, pending: 0, paid: 0 },
    support: { total: 0, open: 0, resolved: 0 },
    affiliate: { total: 0, active: 0, earnings: 0 }
  });
  const { success, error } = useToast();
  const [theme] = useTheme();
  const navigate = useNavigate();
  const user = getActiveUser();

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`max-w-md mx-auto text-center p-8 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="text-6xl mb-4">🔒</div>
          <h1 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Truy cập bị từ chối
          </h1>
          <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Chỉ Admin mới có thể truy cập Business Dashboard
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quay về Dashboard
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchBusinessStats();
  }, []);

  const fetchBusinessStats = async () => {
    setLoading(true);
    try {
      const [paymentStats, subscriptionStats, invoiceStats, supportStats, affiliateStats] = await Promise.all([
        api.get('/api/business/payment/stats'),
        api.get('/api/business/subscription/stats'),
        api.get('/api/business/invoice/stats'),
        api.get('/api/business/support/stats'),
        api.get('/api/business/affiliate/stats')
      ]);

      setStats({
        payments: paymentStats.data,
        subscriptions: subscriptionStats.data,
        invoices: invoiceStats.data,
        support: supportStats.data,
        affiliate: affiliateStats.data
      });
    } catch (err) {
      error('Lỗi tải dữ liệu', 'Không thể tải thống kê business');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Tổng quan', icon: '📊' },
    { id: 'payments', name: 'Thanh toán', icon: '💳' },
    { id: 'subscriptions', name: 'Đăng ký', icon: '📋' },
    { id: 'invoices', name: 'Hóa đơn', icon: '🧾' },
    { id: 'support', name: 'Hỗ trợ', icon: '🎧' },
    { id: 'affiliate', name: 'Tiếp thị', icon: '🤝' }
  ];

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {title}
          </p>
          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </p>
          {subtitle && (
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Tổng doanh thu"
          value={`$${stats.payments.totalAmount || 0}`}
          icon="💰"
          color="bg-green-100 text-green-600"
          subtitle="Tất cả thanh toán"
        />
        <StatCard
          title="Đăng ký hoạt động"
          value={stats.subscriptions.active || 0}
          icon="📋"
          color="bg-blue-100 text-blue-600"
          subtitle="Người dùng đang sử dụng"
        />
        <StatCard
          title="Hóa đơn chờ"
          value={stats.invoices.pendingInvoices || 0}
          icon="🧾"
          color="bg-yellow-100 text-yellow-600"
          subtitle="Cần xử lý"
        />
        <StatCard
          title="Ticket hỗ trợ"
          value={stats.support.openTickets || 0}
          icon="🎧"
          color="bg-red-100 text-red-600"
          subtitle="Đang mở"
        />
        <StatCard
          title="Affiliate hoạt động"
          value={stats.affiliate.activeAffiliates || 0}
          icon="🤝"
          color="bg-purple-100 text-purple-600"
          subtitle="Đang kiếm tiền"
        />
        <StatCard
          title="Tổng hoa hồng"
          value={`$${stats.affiliate.totalCommissions || 0}`}
          icon="💎"
          color="bg-indigo-100 text-indigo-600"
          subtitle="Đã trả"
        />
      </div>

      <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Thống kê chi tiết
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.payments.successfulPayments || 0}
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Thanh toán thành công
            </p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.subscriptions.total || 0}
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Tổng đăng ký
            </p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.invoices.totalInvoices || 0}
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Tổng hóa đơn
            </p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {stats.support.totalTickets || 0}
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Tổng ticket
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const PaymentsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Quản lý thanh toán
        </h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Tạo thanh toán mới
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Thanh toán thành công"
          value={stats.payments.successfulPayments || 0}
          icon="✅"
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Thanh toán chờ"
          value={stats.payments.pendingPayments || 0}
          icon="⏳"
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="Thanh toán thất bại"
          value={stats.payments.failedPayments || 0}
          icon="❌"
          color="bg-red-100 text-red-600"
        />
      </div>
    </div>
  );

  const SubscriptionsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Quản lý đăng ký
        </h3>
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          Tạo gói mới
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Đăng ký hoạt động"
          value={stats.subscriptions.active || 0}
          icon="🟢"
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Đăng ký đã hủy"
          value={stats.subscriptions.cancelled || 0}
          icon="🔴"
          color="bg-red-100 text-red-600"
        />
        <StatCard
          title="Tổng đăng ký"
          value={stats.subscriptions.total || 0}
          icon="📊"
          color="bg-blue-100 text-blue-600"
        />
      </div>
    </div>
  );

  const InvoicesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Quản lý hóa đơn
        </h3>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          Tạo hóa đơn mới
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Hóa đơn đã thanh toán"
          value={stats.invoices.paidInvoices || 0}
          icon="✅"
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Hóa đơn chờ"
          value={stats.invoices.pendingInvoices || 0}
          icon="⏳"
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="Hóa đơn quá hạn"
          value={stats.invoices.overdueInvoices || 0}
          icon="⚠️"
          color="bg-red-100 text-red-600"
        />
      </div>
    </div>
  );

  const SupportTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Hỗ trợ khách hàng
        </h3>
        <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          Tạo ticket mới
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Ticket mở"
          value={stats.support.openTickets || 0}
          icon="🔓"
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Ticket đang xử lý"
          value={stats.support.inProgressTickets || 0}
          icon="⚙️"
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="Ticket đã giải quyết"
          value={stats.support.resolvedTickets || 0}
          icon="✅"
          color="bg-green-100 text-green-600"
        />
      </div>
    </div>
  );

  const AffiliateTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Hệ thống tiếp thị liên kết
        </h3>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Quản lý affiliate
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Affiliate hoạt động"
          value={stats.affiliate.activeAffiliates || 0}
          icon="🤝"
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Tổng hoa hồng"
          value={`$${stats.affiliate.totalCommissions || 0}`}
          icon="💰"
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="Hoa hồng chờ"
          value={`$${stats.affiliate.pendingPayouts || 0}`}
          icon="⏳"
          color="bg-blue-100 text-blue-600"
        />
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'payments':
        return <PaymentsTab />;
      case 'subscriptions':
        return <SubscriptionsTab />;
      case 'invoices':
        return <InvoicesTab />;
      case 'support':
        return <SupportTab />;
      case 'affiliate':
        return <AffiliateTab />;
      default:
        return <OverviewTab />;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Business Dashboard
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Quản lý tất cả hoạt động kinh doanh của bạn
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default BusinessDashboard;
