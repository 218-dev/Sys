import express from "express";
import axios from "axios";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 4040;

  app.use(express.json());

  const API_URL = 'http://localhost:4340/api';

  // Proxy API Routes
  app.get("/api/balance", async (req, res) => {
    try {
      const response = await axios.get(`${API_URL}/balance`);
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const response = await axios.get(`${API_URL}/products`);
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const response = await axios.post(`${API_URL}/orders`, req.body);
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const { status } = req.query;
      let url = `${API_URL}/orders`;
      if (status) url += `?status=${status}`;
      const response = await axios.get(url);
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/orders/:order_id", async (req, res) => {
    try {
      const response = await axios.get(`${API_URL}/orders/${req.params.order_id}`);
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/orders/:order_id/status", async (req, res) => {
    try {
      const response = await axios.put(`${API_URL}/orders/${req.params.order_id}/status`, req.body);
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/orders/:order_id", async (req, res) => {
    try {
      const response = await axios.delete(`${API_URL}/orders/${req.params.order_id}`);
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Keep other routes if they are needed by the frontend, or proxy them too
  app.get("/api/purchases", async (req, res) => {
    try {
      const response = await axios.get(`${API_URL}/purchases`);
      res.json(response.data);
    } catch (error: any) {
      // Fallback if not implemented in external API
      res.json({ success: true, purchases: [] });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      res.json(response.data);
    } catch (error: any) {
      // Fallback if not implemented in external API
      res.json({ success: true, stats: { total_orders: 0, active_orders: 0, completed_orders: 0, total_purchases: 0, total_items_purchased: 0 } });
    }
  });

  app.post("/api/decrypt", async (req, res) => {
    try {
      const response = await axios.post(`${API_URL}/decrypt`, req.body);
      res.json(response.data);
    } catch (error: any) {
      res.json({ success: true, decrypted: `DEC-${req.body.code}` });
    }
  });

  app.post("/api/auto-orders/calculate", async (req, res) => {
    try {
      const response = await axios.post(`${API_URL}/auto-orders/calculate`, req.body);
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auto-orders/execute", async (req, res) => {
    try {
      const response = await axios.post(`${API_URL}/auto-orders/execute`, req.body);
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
