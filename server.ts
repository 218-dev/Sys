import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock Data
  let balance = 1000.50;
  let products = [
    {
      id: "6546",
      name: "Binance 5 Tether (USDT)",
      category: "Binance",
      face_value: 5,
      currency: "USD",
      cost: 5.2,
      image: "https://picsum.photos/seed/usdt5/200/200",
      description: "Binance Gift Card - 5 USDT"
    },
    {
      id: "6547",
      name: "Binance 10 Tether (USDT)",
      category: "Binance",
      face_value: 10,
      currency: "USD",
      cost: 10.3,
      image: "https://picsum.photos/seed/usdt10/200/200",
      description: "Binance Gift Card - 10 USDT"
    },
    {
      id: "6548",
      name: "Binance 20 Tether (USDT)",
      category: "Binance",
      face_value: 20,
      currency: "USD",
      cost: 20.5,
      image: "https://picsum.photos/seed/usdt20/200/200",
      description: "Binance Gift Card - 20 USDT"
    },
    {
      id: "6549",
      name: "Binance 50 Tether (USDT)",
      category: "Binance",
      face_value: 50,
      currency: "USD",
      cost: 51.0,
      image: "https://picsum.photos/seed/usdt50/200/200",
      description: "Binance Gift Card - 50 USDT"
    }
  ];

  let orders = [
    {
      id: "ORD_1705319400_6548",
      product_id: "6548",
      product_name: "Binance 20 Tether (USDT)",
      quantity_requested: 5,
      quantity_purchased: 3,
      status: "active",
      created_at: "2024-01-15 10:30:00"
    }
  ];

  let purchases = [
    {
      id: 1,
      order_id: "ORD_1705319400_6548",
      product_id: "6548",
      serial_code: "ABCD1234",
      serial_number: "SN123456",
      decrypted_code: "GIFT-CODE-123",
      status: "success",
      created_at: "2024-01-15 10:35:00"
    }
  ];

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      port: PORT,
      timestamp: new Date().toISOString(),
      monitoring: true
    });
  });

  app.get("/api/balance", (req, res) => {
    res.json({
      balance: balance,
      currency: "USD",
      message: "success"
    });
  });

  app.get("/api/products", (req, res) => {
    res.json({
      success: true,
      products: products,
      count: products.length
    });
  });

  app.get("/api/products/summary", (req, res) => {
    res.json({
      success: true,
      products: products.map(p => ({
        id: p.id,
        value: `${p.face_value} ${p.currency}`,
        name: p.name,
        cost: p.cost
      }))
    });
  });

  app.post("/api/orders", (req, res) => {
    const { product_id, quantity } = req.body;
    const product = products.find(p => p.id === product_id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const newOrder = {
      id: `ORD_${Date.now()}_${product_id}`,
      product_id,
      product_name: product.name,
      quantity_requested: quantity,
      quantity_purchased: 0,
      status: "active",
      created_at: new Date().toISOString().replace('T', ' ').split('.')[0]
    };
    orders.push(newOrder);
    res.json({
      success: true,
      order_id: newOrder.id,
      message: "Order created successfully"
    });
  });

  app.get("/api/orders", (req, res) => {
    const { status } = req.query;
    let filteredOrders = orders;
    if (status) {
      filteredOrders = orders.filter(o => o.status === status);
    }
    res.json({
      success: true,
      orders: filteredOrders,
      count: filteredOrders.length
    });
  });

  app.get("/api/orders/:order_id", (req, res) => {
    const order = orders.find(o => o.id === req.params.order_id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, order });
  });

  app.put("/api/orders/:order_id/status", (req, res) => {
    const { status } = req.body;
    const orderIndex = orders.findIndex(o => o.id === req.params.order_id);
    if (orderIndex === -1) return res.status(404).json({ success: false, message: "Order not found" });
    
    orders[orderIndex].status = status;
    res.json({ success: true, message: `Order status updated to ${status}` });
  });

  app.delete("/api/orders/:order_id", (req, res) => {
    const orderIndex = orders.findIndex(o => o.id === req.params.order_id);
    if (orderIndex === -1) return res.status(404).json({ success: false, message: "Order not found" });
    
    orders.splice(orderIndex, 1);
    res.json({ success: true, message: "Order deleted successfully" });
  });

  app.get("/api/purchases", (req, res) => {
    const { order_id, limit } = req.query;
    let filteredPurchases = purchases;
    if (order_id) {
      filteredPurchases = purchases.filter(p => p.order_id === order_id);
    }
    if (limit) {
      filteredPurchases = filteredPurchases.slice(0, parseInt(limit as string));
    }
    res.json({
      success: true,
      purchases: filteredPurchases,
      count: filteredPurchases.length
    });
  });

  app.post("/api/auto-orders/calculate", (req, res) => {
    const { product_ids } = req.body;
    const selectedProducts = products.filter(p => product_ids.includes(p.id));
    
    // Simple calculation: use 96% of balance, reserve 4%
    const reserve_amount = balance * 0.04;
    const available_balance = balance - reserve_amount;
    
    const calculatedOrders = selectedProducts.map(p => {
      const count = Math.floor(available_balance / p.cost / selectedProducts.length);
      return {
        product: {
          id: p.id,
          name: p.name,
          cost: p.cost
        },
        count: count,
        total_cost: count * p.cost
      };
    });

    res.json({
      success: true,
      calculation: {
        original_balance: balance,
        available_balance: available_balance,
        reserve_amount: reserve_amount,
        orders: calculatedOrders,
        total_orders: calculatedOrders.reduce((acc, curr) => acc + curr.count, 0)
      }
    });
  });

  app.post("/api/auto-orders/execute", (req, res) => {
    const { products: requestedProducts } = req.body;
    requestedProducts.forEach((rp: any) => {
      const p = products.find(prod => prod.id === rp.id);
      if (p) {
        orders.push({
          id: `ORD_AUTO_${Date.now()}_${p.id}`,
          product_id: p.id,
          product_name: p.name,
          quantity_requested: rp.count,
          quantity_purchased: 0,
          status: "active",
          created_at: new Date().toISOString().replace('T', ' ').split('.')[0]
        });
      }
    });
    res.json({ success: true, message: "Auto-orders executed" });
  });

  app.post("/api/decrypt", (req, res) => {
    const { code } = req.body;
    res.json({
      success: true,
      original: code,
      decrypted: `GIFT-CODE-${code.split('').reverse().join('').substring(0, 8).toUpperCase()}`
    });
  });

  app.get("/api/stats", (req, res) => {
    const total_cost = purchases.reduce((acc, curr) => {
      const p = products.find(prod => prod.id === curr.product_id);
      return acc + (p ? p.cost : 0);
    }, 0);

    res.json({
      success: true,
      stats: {
        total_orders: orders.length,
        active_orders: orders.filter(o => o.status === 'active').length,
        completed_orders: orders.filter(o => o.status === 'completed').length,
        total_purchases: purchases.length,
        total_items_purchased: purchases.length,
        total_cost_usd: total_cost,
        monitoring_active: true,
        products_count: products.length,
        port: PORT
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
