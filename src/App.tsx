/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ClipboardList, 
  History, 
  Settings, 
  Activity, 
  Wallet,
  RefreshCw,
  Trash2,
  Play,
  Square,
  Lock,
  Calculator,
  ChevronLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  Copy,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Product, Order, Purchase, Stats, Balance } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'purchases' | 'tools'>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});

  // Tools State
  const [decryptCode, setDecryptCode] = useState('');
  const [decryptedResult, setDecryptedResult] = useState<string | null>(null);
  const [autoOrderIds, setAutoOrderIds] = useState<string[]>([]);
  const [calculation, setCalculation] = useState<any>(null);
  const [topUpAmount, setTopUpAmount] = useState<string>('');

  // Persistence Logic: Load from LocalStorage (Only for UI preferences)
  useEffect(() => {
    const savedCopied = localStorage.getItem('booking_copied_ids');
    if (savedCopied) {
      setCopiedIds(new Set(JSON.parse(savedCopied)));
    }
    fetchData();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, []);

  // Save UI preferences to LocalStorage
  useEffect(() => {
    localStorage.setItem('booking_copied_ids', JSON.stringify(Array.from(copiedIds)));
  }, [copiedIds]);

  const fetchData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [statsRes, balanceRes, productsRes, ordersRes, purchasesRes] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/balance').then(r => r.json()),
        fetch('/api/products').then(r => r.json()),
        fetch('/api/orders').then(r => r.json()),
        fetch('/api/purchases').then(r => r.json())
      ]);

      setStats(statsRes.stats);
      setBalance(balanceRes);
      setProducts(productsRes.products);
      setOrders(ordersRes.orders);
      setPurchases(purchasesRes.purchases);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCreateOrder = async (productId: string) => {
    const quantity = productQuantities[productId] || 1;
    const product = products.find(p => p.id === productId);
    
    if (!product || !balance) {
      setError('خطأ في البيانات: المنتج أو الرصيد غير متوفر');
      return;
    }

    if (quantity <= 0) {
      setError('يرجى إدخال كمية صحيحة');
      return;
    }

    if (balance.balance < product.cost * quantity) {
      setError('عذراً، الرصيد المتاح غير كافٍ لإتمام هذه العملية');
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, quantity })
      });
      const data = await res.json();
      if (data.success) {
        // Reset quantity for this product
        setProductQuantities(prev => ({ ...prev, [productId]: 1 }));
        setActiveTab('orders');
        fetchData(true);
      } else {
        setError(data.message || 'فشل في إنشاء الطلب');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setError('حدث خطأ أثناء الاتصال بالخادم');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        fetchData(true);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchData(true);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const handleCopy = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedIds(prev => {
      const next = new Set(prev);
      next.add(String(id));
      return next;
    });
  };

  const handleTopUp = () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('يرجى إدخال مبلغ صحيح للشحن');
      return;
    }
    setBalance(prev => prev ? { ...prev, balance: prev.balance + amount } : { balance: amount, currency: 'USDT', message: 'Success' });
    setTopUpAmount('');
    // Show success feedback? Maybe just the balance update is enough
  };

  const handleResetSystem = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إعادة ضبط النظام؟ سيتم مسح جميع البيانات المحلية.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleDecrypt = async () => {
    if (!decryptCode) return;
    try {
      const res = await fetch('/api/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: decryptCode })
      });
      const data = await res.json();
      setDecryptedResult(data.decrypted);
    } catch (error) {
      console.error('Error decrypting:', error);
    }
  };

  const handleCalculateAuto = async () => {
    if (autoOrderIds.length === 0) return;
    try {
      const res = await fetch('/api/auto-orders/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: autoOrderIds })
      });
      const data = await res.json();
      setCalculation(data.calculation);
    } catch (error) {
      console.error('Error calculating auto-orders:', error);
    }
  };

  const handleExecuteAuto = async () => {
    if (!calculation) return;
    try {
      await fetch('/api/auto-orders/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          products: calculation.orders.map((o: any) => ({ id: o.product.id, count: o.count }))
        })
      });
      setCalculation(null);
      setAutoOrderIds([]);
      fetchData();
      setActiveTab('orders');
    } catch (error) {
      console.error('Error executing auto-orders:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#f0fdf4]" dir="rtl">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <RefreshCw className="w-16 h-16 text-emerald-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-emerald-900 mb-2">منظومة حجز</h2>
            <p className="font-bold text-emerald-600/60">جاري تهيئة النظام الآمن...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen grid grid-cols-1 lg:grid-cols-2 bg-[#f0fdf4]" dir="rtl">
      {/* Right Side: Content & Controls */}
      <div className="flex flex-col h-full overflow-hidden border-l border-emerald-100 bg-white/50 backdrop-blur-md">
        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '50%' }}
              animate={{ opacity: 1, y: 20, x: '50%' }}
              exit={{ opacity: 0, y: -20, x: '50%' }}
              className="fixed top-4 right-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500/50 backdrop-blur-xl"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold text-sm">{error}</span>
              <button onClick={() => setError(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top: Header & Balance */}
        <div className="p-8 border-b border-emerald-100/50 flex justify-between items-center bg-white/40">
          <div className="flex items-center gap-5">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200/50"
            >
              <Wallet className="w-7 h-7" />
            </motion.div>
            <div>
              <p className="text-[11px] font-black text-emerald-600/60 uppercase tracking-[0.2em] mb-1">الرصيد المتاح</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-950 tracking-tight">{balance?.balance.toLocaleString()}</span>
                <span className="text-sm font-bold text-emerald-600/40">{balance?.currency}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => fetchData()}
              className="p-3.5 hover:bg-emerald-100 rounded-2xl transition-all text-emerald-600 bg-white shadow-sm border border-emerald-50"
              title="تحديث البيانات"
            >
              <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
            </motion.button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-8 py-4 border-b border-emerald-100/30 flex gap-3 overflow-x-auto custom-scrollbar bg-white/20">
          {[
            { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
            { id: 'products', label: 'المنتجات', icon: ShoppingBag },
            { id: 'orders', label: 'الطلبات', icon: ClipboardList },
            { id: 'purchases', label: 'السجل', icon: History },
            { id: 'tools', label: 'الأدوات', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "nav-btn whitespace-nowrap",
                activeTab === item.id && "active"
              )}
            >
              <item.icon className="w-4.5 h-4.5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: 'إجمالي الطلبات', value: stats?.total_orders, icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'الطلبات النشطة', value: stats?.active_orders, icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'الطلبات المكتملة', value: stats?.completed_orders, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'إجمالي العناصر', value: stats?.total_items_purchased, icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50' },
                  ].map((stat, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="modern-card p-6"
                    >
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg)}>
                        <stat.icon className={cn("w-6 h-6", stat.color)} />
                      </div>
                      <p className="text-3xl font-black text-emerald-950 tracking-tight">{stat.value}</p>
                      <p className="text-xs font-bold text-emerald-600/50 mt-1 uppercase tracking-widest">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="modern-card p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-emerald-950">آخر التحركات</h3>
                    <Activity className="w-5 h-5 text-emerald-300 animate-pulse" />
                  </div>
                  <div className="space-y-4">
                    {orders.slice(0, 4).map((order, i) => (
                      <motion.div 
                        key={order.id} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 hover:bg-emerald-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                          <span className="text-sm font-bold text-emerald-900 line-clamp-1">{order.product_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-black text-emerald-600/40 font-mono">{order.created_at.split(' ')[1]}</span>
                          <ChevronLeft className="w-4 h-4 text-emerald-200" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'products' && (
              <motion.div
                key="products"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                {products.map((product, i) => (
                  <motion.div 
                    key={product.id} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="modern-card group overflow-hidden"
                  >
                    <div className="aspect-video bg-emerald-50 relative overflow-hidden">
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl font-black text-emerald-600 shadow-xl border border-white text-sm">
                        ${product.cost.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-6 space-y-5">
                      <h4 className="font-black text-lg text-emerald-950 line-clamp-1">{product.name}</h4>
                      
                      <div className="flex items-center gap-3 bg-emerald-50/50 p-2 rounded-2xl border border-emerald-100/50">
                        <button 
                          onClick={() => setProductQuantities(prev => ({ ...prev, [product.id]: Math.max(1, (prev[product.id] || 1) - 1) }))}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-xl text-emerald-600 shadow-sm hover:bg-emerald-600 hover:text-white transition-all"
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          min="1"
                          value={productQuantities[product.id] || 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setProductQuantities(prev => ({ ...prev, [product.id]: Math.max(1, val) }));
                          }}
                          className="flex-1 bg-transparent text-center font-black text-emerald-950 focus:outline-none text-sm"
                        />
                        <button 
                          onClick={() => setProductQuantities(prev => ({ ...prev, [product.id]: (prev[product.id] || 1) + 1 }))}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-xl text-emerald-600 shadow-sm hover:bg-emerald-600 hover:text-white transition-all"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleCreateOrder(product.id)}
                          className="btn-primary flex-1 text-sm py-3"
                        >
                          شراء سريع
                          <Zap className="w-4 h-4" />
                        </button>
                        <motion.button 
                          whileHover={{ rotate: 15 }}
                          onClick={() => {
                            setAutoOrderIds(prev => prev.includes(product.id) ? prev.filter(id => id !== product.id) : [...prev, product.id]);
                          }}
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all",
                            autoOrderIds.includes(product.id) ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200" : "border-emerald-100 text-emerald-300 hover:border-emerald-600 hover:text-emerald-600"
                          )}
                        >
                          <Calculator className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {orders.length === 0 ? (
                  <div className="py-32 text-center opacity-10">
                    <ClipboardList className="w-24 h-24 mx-auto mb-6" />
                    <p className="font-black text-2xl">لا توجد طلبات نشطة</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="modern-card p-6 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[11px] font-black text-emerald-600/40 uppercase tracking-[0.2em]">طلب #{order.id.split('_')[1]}</p>
                          <h4 className="font-black text-xl text-emerald-950">{order.product_name}</h4>
                        </div>
                        <span className={cn(
                          "px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest",
                          order.status === 'active' ? "bg-blue-50 text-blue-600 border border-blue-100" : 
                          order.status === 'completed' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                        )}>
                          {order.status === 'active' ? 'نشط' : order.status === 'completed' ? 'مكتمل' : 'متوقف'}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold text-emerald-900/60">
                          <span>نسبة الإنجاز</span>
                          <span>{Math.round((order.quantity_purchased / order.quantity_requested) * 100)}%</span>
                        </div>
                        <div className="h-3 bg-emerald-50 rounded-full overflow-hidden border border-emerald-100/50">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(order.quantity_purchased / order.quantity_requested) * 100}%` }}
                            className="h-full bg-gradient-to-l from-emerald-400 to-emerald-600 rounded-full" 
                          />
                        </div>
                        <div className="flex justify-center">
                          <span className="text-sm font-black text-emerald-950">{order.quantity_purchased} <span className="text-emerald-300 mx-1">/</span> {order.quantity_requested}</span>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t border-emerald-50">
                        {order.status === 'active' ? (
                          <button onClick={() => handleUpdateStatus(order.id, 'stopped')} className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all">
                            <Square className="w-4 h-4" />
                          </button>
                        ) : order.status === 'stopped' ? (
                          <button onClick={() => handleUpdateStatus(order.id, 'active')} className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
                            <Play className="w-4 h-4" />
                          </button>
                        ) : null}
                        <button onClick={() => handleDeleteOrder(order.id)} className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'purchases' && (
              <motion.div
                key="purchases"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-6"
              >
                {purchases.length === 0 ? (
                  <div className="py-32 text-center opacity-10">
                    <History className="w-24 h-24 mx-auto mb-6" />
                    <p className="font-black text-2xl">السجل فارغ</p>
                  </div>
                ) : (
                  purchases.map((purchase) => (
                    <div key={purchase.id} className="modern-card p-6">
                      <div className="flex justify-between items-center mb-5">
                        <span className="font-mono text-[11px] font-bold text-emerald-600/30 tracking-widest">#{purchase.id}</span>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase border border-emerald-100">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          عملية ناجحة
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex justify-between items-center bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/30">
                          <span className="text-[11px] font-black text-emerald-600/40 uppercase tracking-widest">الكود المشفر</span>
                          <span className="font-mono text-sm font-black text-emerald-950">{purchase.serial_code}</span>
                        </div>
                        <div className="flex justify-between items-center bg-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-100 relative group/code">
                          <span className="text-[11px] font-black text-emerald-100/60 uppercase tracking-widest">الكود المستلم</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-black text-white tracking-widest">{purchase.decrypted_code}</span>
                            <div className="flex items-center gap-2">
                              {copiedIds.has(String(purchase.id)) && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="text-red-400"
                                >
                                  <Heart className="w-4 h-4 fill-current" />
                                </motion.div>
                              )}
                              <button 
                                onClick={() => handleCopy(purchase.decrypted_code, purchase.id)}
                                className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
                                title="نسخ الكود"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-5 px-1">
                        <p className="text-[11px] font-bold text-emerald-600/30">{purchase.created_at}</p>
                        <TrendingUp className="w-4 h-4 text-emerald-100" />
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'tools' && (
              <motion.div
                key="tools"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="space-y-10"
              >
                {/* Decryptor */}
                <div className="modern-card p-8 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-emerald-950">فك التشفير</h3>
                      <p className="text-xs font-bold text-emerald-600/40">تحويل الأكواد المشفرة إلى صيغتها الأصلية</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="relative">
                      <input 
                        type="text" 
                        value={decryptCode}
                        onChange={(e) => setDecryptCode(e.target.value)}
                        placeholder="أدخل الكود المشفر هنا..."
                        className="w-full bg-emerald-50/50 border-2 border-emerald-100 rounded-2xl p-5 font-mono text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-emerald-950 placeholder:text-emerald-200"
                      />
                    </div>
                    <button onClick={handleDecrypt} className="btn-primary w-full py-5 text-lg">بدء المعالجة</button>
                    <AnimatePresence>
                      {decryptedResult && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-6 bg-emerald-950 text-white rounded-2xl shadow-2xl overflow-hidden"
                        >
                          <p className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">النتيجة النهائية</p>
                          <p className="font-mono text-2xl font-black tracking-[0.2em]">{decryptedResult}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Auto-Order Calculator */}
                <div className="modern-card p-8 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      <Calculator className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-emerald-950">المحرك الذكي</h3>
                      <p className="text-xs font-bold text-emerald-600/40">توزيع الرصيد بأفضل كفاءة ممكنة</p>
                    </div>
                  </div>
                  {!calculation ? (
                    <div className="py-16 border-2 border-dashed border-emerald-100 rounded-3xl text-center space-y-5 bg-emerald-50/20">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <ShoppingBag className="w-10 h-10 text-emerald-100" />
                      </div>
                      <p className="text-sm font-bold text-emerald-300">لم يتم اختيار منتجات للحساب</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-5">
                        <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <p className="text-[11px] font-black text-emerald-600/40 uppercase mb-2">المتاح</p>
                          <p className="text-2xl font-black text-emerald-950 tracking-tight">${calculation.available_balance.toLocaleString()}</p>
                        </div>
                        <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                          <p className="text-[11px] font-black text-amber-600/40 uppercase mb-2">المحجوز</p>
                          <p className="text-2xl font-black text-amber-900 tracking-tight">${calculation.reserve_amount.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border border-emerald-100 divide-y divide-emerald-50 overflow-hidden">
                        {calculation.orders.map((o: any) => (
                          <div key={o.product.id} className="p-5 flex justify-between items-center">
                            <span className="font-bold text-emerald-950">{o.product.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-bold text-emerald-300">الكمية</span>
                              <span className="font-black text-emerald-600 text-xl">x{o.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => setCalculation(null)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-sm hover:bg-emerald-100 transition-all">إلغاء</button>
                        <button onClick={handleExecuteAuto} className="flex-[2] btn-primary">تأكيد التنفيذ</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Balance Management & Reset */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="modern-card p-8 space-y-6">
                    <h3 className="text-xl font-black text-emerald-950">شحن الرصيد</h3>
                    <div className="flex gap-3">
                      <input 
                        type="number" 
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        placeholder="المبلغ..."
                        className="flex-1 bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <button onClick={handleTopUp} className="btn-primary py-3 px-6 text-xs">شحن</button>
                    </div>
                  </div>
                  <div className="modern-card p-8 space-y-6 border-red-100 bg-red-50/10">
                    <h3 className="text-xl font-black text-red-900">إدارة النظام</h3>
                    <button 
                      onClick={handleResetSystem}
                      className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-black text-xs hover:bg-red-100 transition-all border border-red-100"
                    >
                      إعادة ضبط المصنع
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Left Side: Brand/Hero (Desktop Only) */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-emerald-950 relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              x: [0, 50, 0],
              y: [0, -50, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-600/20 blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
              x: [0, -50, 0],
              y: [0, 50, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-400/10 blur-[120px]" 
          />
        </div>
        
        {/* Brand Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-16 max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="w-24 h-24 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 flex items-center justify-center shadow-2xl mb-8 mx-auto">
              <Wallet className="w-12 h-12 text-emerald-400" />
            </div>
            <h1 className="text-8xl font-black text-white tracking-tighter mb-6 leading-none">
              منظومة <span className="text-emerald-400">حجز</span>
            </h1>
            <div className="h-2 w-32 bg-gradient-to-r from-emerald-400 to-transparent mx-auto rounded-full mb-8" />
            <p className="text-emerald-100/60 text-2xl font-medium leading-relaxed">
              الجيل القادم من أنظمة إدارة الأصول الرقمية. كفاءة، أمان، وسرعة فائقة في معالجة الحجوزات.
            </p>
          </motion.div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-12 w-full pt-16 border-t border-white/5">
            <div className="space-y-2">
              <p className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.3em]">الطلبات</p>
              <p className="text-white text-4xl font-black tracking-tight">{stats?.total_orders || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.3em]">العمليات</p>
              <p className="text-white text-4xl font-black tracking-tight">{stats?.total_purchases || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.3em]">الحالة</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                <p className="text-emerald-400 text-2xl font-black">متصل</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-12 right-12 flex gap-4 opacity-20">
          <Activity className="w-6 h-6 text-white" />
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
