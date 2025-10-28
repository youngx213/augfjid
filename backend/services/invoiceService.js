import { redis } from "../redis.js";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import EventEmitter from "events";

/**
 * Service Invoice Generation cho hệ thống
 */
class InvoiceService extends EventEmitter {
  constructor() {
    super();
    this.invoices = new Map();
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * Khởi tạo invoice templates
   */
  initializeTemplates() {
    this.templates.set('default', {
      name: 'Default Template',
      html: this.getDefaultTemplate(),
      css: this.getDefaultCSS()
    });

    this.templates.set('modern', {
      name: 'Modern Template',
      html: this.getModernTemplate(),
      css: this.getModernCSS()
    });

    this.templates.set('minimal', {
      name: 'Minimal Template',
      html: this.getMinimalTemplate(),
      css: this.getMinimalCSS()
    });
  }

  /**
   * Tạo invoice
   */
  async generateInvoice(invoiceData) {
    try {
      const invoice = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoiceNumber: this.generateInvoiceNumber(),
        userId: invoiceData.userId,
        customerInfo: invoiceData.customerInfo,
        companyInfo: invoiceData.companyInfo || this.getDefaultCompanyInfo(),
        items: invoiceData.items,
        subtotal: invoiceData.subtotal,
        tax: invoiceData.tax || 0,
        discount: invoiceData.discount || 0,
        total: invoiceData.total,
        currency: invoiceData.currency || 'USD',
        status: 'pending',
        createdAt: new Date().toISOString(),
        dueDate: invoiceData.dueDate || this.calculateDueDate(30),
        paymentTerms: invoiceData.paymentTerms || 'Net 30',
        notes: invoiceData.notes || '',
        template: invoiceData.template || 'default',
        pdfPath: null,
        metadata: invoiceData.metadata || {}
      };

      // Generate PDF
      const pdfPath = await this.generatePDF(invoice);
      invoice.pdfPath = pdfPath;

      await redis.hset(`invoice:${invoice.id}`, invoice);
      this.invoices.set(invoice.id, invoice);
      
      this.emit('invoice:created', invoice);
      return invoice;
    } catch (error) {
      console.error("Failed to generate invoice:", error.message);
      throw error;
    }
  }

  /**
   * Tạo invoice number
   */
  generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `INV-${year}${month}${day}-${random}`;
  }

  /**
   * Tính toán due date
   */
  calculateDueDate(days) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toISOString();
  }

  /**
   * Lấy thông tin công ty mặc định
   */
  getDefaultCompanyInfo() {
    return {
      name: 'TikTok Bot Services',
      address: '123 Business Street, City, State 12345',
      phone: '+1 (555) 123-4567',
      email: 'billing@tiktokbot.com',
      website: 'https://tiktokbot.com',
      taxId: 'TAX-123456789'
    };
  }

  /**
   * Tạo PDF từ invoice
   */
  async generatePDF(invoice) {
    try {
      const template = this.templates.get(invoice.template);
      if (!template) {
        throw new Error(`Template not found: ${invoice.template}`);
      }

      // Create HTML content
      const htmlContent = this.renderTemplate(template.html, invoice);
      const cssContent = template.css;

      // Create temporary files
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });

      const htmlFile = path.join(tempDir, `invoice_${invoice.id}.html`);
      const cssFile = path.join(tempDir, `invoice_${invoice.id}.css`);
      const pdfFile = path.join(tempDir, `invoice_${invoice.id}.pdf`);

      // Write HTML and CSS files
      await fs.writeFile(htmlFile, htmlContent);
      await fs.writeFile(cssFile, cssContent);

      // Generate PDF using wkhtmltopdf
      await this.convertHTMLToPDF(htmlFile, pdfFile);

      // Move PDF to invoices directory
      const invoicesDir = path.join(process.cwd(), 'invoices');
      await fs.mkdir(invoicesDir, { recursive: true });

      const finalPdfPath = path.join(invoicesDir, `invoice_${invoice.id}.pdf`);
      await fs.rename(pdfFile, finalPdfPath);

      // Clean up temporary files
      await fs.unlink(htmlFile);
      await fs.unlink(cssFile);

      return finalPdfPath;
    } catch (error) {
      console.error("Failed to generate PDF:", error.message);
      throw error;
    }
  }

  /**
   * Convert HTML to PDF using wkhtmltopdf
   */
  async convertHTMLToPDF(htmlFile, pdfFile) {
    return new Promise((resolve, reject) => {
      const wkhtmltopdf = spawn('wkhtmltopdf', [
        '--page-size', 'A4',
        '--margin-top', '20mm',
        '--margin-right', '20mm',
        '--margin-bottom', '20mm',
        '--margin-left', '20mm',
        '--encoding', 'UTF-8',
        '--no-outline',
        htmlFile,
        pdfFile
      ]);

      wkhtmltopdf.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`wkhtmltopdf failed with code ${code}`));
        }
      });

      wkhtmltopdf.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Render template với data
   */
  renderTemplate(template, data) {
    let html = template;
    
    // Replace placeholders
    html = html.replace(/\{\{invoiceNumber\}\}/g, data.invoiceNumber);
    html = html.replace(/\{\{invoiceDate\}\}/g, this.formatDate(data.createdAt));
    html = html.replace(/\{\{dueDate\}\}/g, this.formatDate(data.dueDate));
    html = html.replace(/\{\{paymentTerms\}\}/g, data.paymentTerms);
    html = html.replace(/\{\{notes\}\}/g, data.notes || '');
    
    // Company info
    html = html.replace(/\{\{companyName\}\}/g, data.companyInfo.name);
    html = html.replace(/\{\{companyAddress\}\}/g, data.companyInfo.address);
    html = html.replace(/\{\{companyPhone\}\}/g, data.companyInfo.phone);
    html = html.replace(/\{\{companyEmail\}\}/g, data.companyInfo.email);
    html = html.replace(/\{\{companyWebsite\}\}/g, data.companyInfo.website);
    html = html.replace(/\{\{companyTaxId\}\}/g, data.companyInfo.taxId);
    
    // Customer info
    html = html.replace(/\{\{customerName\}\}/g, data.customerInfo.name);
    html = html.replace(/\{\{customerAddress\}\}/g, data.customerInfo.address);
    html = html.replace(/\{\{customerEmail\}\}/g, data.customerInfo.email);
    
    // Financial info
    html = html.replace(/\{\{subtotal\}\}/g, this.formatCurrency(data.subtotal, data.currency));
    html = html.replace(/\{\{tax\}\}/g, this.formatCurrency(data.tax, data.currency));
    html = html.replace(/\{\{discount\}\}/g, this.formatCurrency(data.discount, data.currency));
    html = html.replace(/\{\{total\}\}/g, this.formatCurrency(data.total, data.currency));
    
    // Items
    html = html.replace(/\{\{items\}\}/g, this.renderItems(data.items, data.currency));
    
    return html;
  }

  /**
   * Render items table
   */
  renderItems(items, currency) {
    let itemsHtml = '';
    
    items.forEach(item => {
      itemsHtml += `
        <tr>
          <td>${item.description}</td>
          <td>${item.quantity}</td>
          <td>${this.formatCurrency(item.unitPrice, currency)}</td>
          <td>${this.formatCurrency(item.total, currency)}</td>
        </tr>
      `;
    });
    
    return itemsHtml;
  }

  /**
   * Format date
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Lấy invoice by ID
   */
  async getInvoice(invoiceId) {
    try {
      const invoice = await redis.hgetall(`invoice:${invoiceId}`);
      return invoice && invoice.id ? invoice : null;
    } catch (error) {
      console.error("Failed to get invoice:", error.message);
      return null;
    }
  }

  /**
   * Lấy invoice history
   */
  async getInvoiceHistory(userId, limit = 50) {
    try {
      const invoiceKeys = await redis.keys(`invoice:*`);
      const invoices = [];

      for (const key of invoiceKeys) {
        const invoice = await redis.hgetall(key);
        if (invoice && invoice.userId === userId) {
          invoices.push(invoice);
        }
      }

      return invoices
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get invoice history:", error.message);
      return [];
    }
  }

  /**
   * Cập nhật invoice status
   */
  async updateInvoiceStatus(invoiceId, status) {
    try {
      const invoice = await redis.hgetall(`invoice:${invoiceId}`);
      if (!invoice || !invoice.id) {
        throw new Error("Invoice not found");
      }

      invoice.status = status;
      invoice.updatedAt = new Date().toISOString();

      await redis.hset(`invoice:${invoiceId}`, invoice);
      this.invoices.set(invoiceId, invoice);
      
      this.emit('invoice:status:updated', invoice);
      return invoice;
    } catch (error) {
      console.error("Failed to update invoice status:", error.message);
      throw error;
    }
  }

  /**
   * Lấy invoice statistics
   */
  async getInvoiceStats(userId = null) {
    try {
      const stats = {
        totalInvoices: 0,
        pendingInvoices: 0,
        paidInvoices: 0,
        overdueInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0
      };

      const invoiceKeys = await redis.keys(`invoice:*`);
      for (const key of invoiceKeys) {
        const invoice = await redis.hgetall(key);
        if (invoice && invoice.id && (!userId || invoice.userId === userId)) {
          stats.totalInvoices++;
          stats.totalAmount += parseFloat(invoice.total) || 0;
          
          switch (invoice.status) {
            case 'pending':
              stats.pendingInvoices++;
              stats.pendingAmount += parseFloat(invoice.total) || 0;
              break;
            case 'paid':
              stats.paidInvoices++;
              stats.paidAmount += parseFloat(invoice.total) || 0;
              break;
            case 'overdue':
              stats.overdueInvoices++;
              break;
          }
        }
      }

      return stats;
    } catch (error) {
      console.error("Failed to get invoice stats:", error.message);
      return {
        totalInvoices: 0,
        pendingInvoices: 0,
        paidInvoices: 0,
        overdueInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0
      };
    }
  }

  /**
   * Lấy tất cả templates
   */
  getTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Tạo template mới
   */
  async createTemplate(templateData) {
    try {
      const template = {
        id: templateData.id,
        name: templateData.name,
        html: templateData.html,
        css: templateData.css,
        createdAt: new Date().toISOString()
      };

      this.templates.set(template.id, template);
      await redis.hset(`invoice:template:${template.id}`, template);
      
      this.emit('template:created', template);
      return template;
    } catch (error) {
      console.error("Failed to create template:", error.message);
      throw error;
    }
  }

  /**
   * Default HTML template
   */
  getDefaultTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice {{invoiceNumber}}</title>
    <link rel="stylesheet" href="invoice.css">
</head>
<body>
    <div class="invoice">
        <header class="invoice-header">
            <div class="company-info">
                <h1>{{companyName}}</h1>
                <p>{{companyAddress}}</p>
                <p>Phone: {{companyPhone}} | Email: {{companyEmail}}</p>
                <p>Website: {{companyWebsite}} | Tax ID: {{companyTaxId}}</p>
            </div>
            <div class="invoice-info">
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> {{invoiceNumber}}</p>
                <p><strong>Date:</strong> {{invoiceDate}}</p>
                <p><strong>Due Date:</strong> {{dueDate}}</p>
                <p><strong>Payment Terms:</strong> {{paymentTerms}}</p>
            </div>
        </header>

        <div class="customer-info">
            <h3>Bill To:</h3>
            <p><strong>{{customerName}}</strong></p>
            <p>{{customerAddress}}</p>
            <p>{{customerEmail}}</p>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                {{items}}
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-row">
                <span>Subtotal:</span>
                <span>{{subtotal}}</span>
            </div>
            <div class="totals-row">
                <span>Tax:</span>
                <span>{{tax}}</span>
            </div>
            <div class="totals-row">
                <span>Discount:</span>
                <span>{{discount}}</span>
            </div>
            <div class="totals-row total">
                <span><strong>Total:</strong></span>
                <span><strong>{{total}}</strong></span>
            </div>
        </div>

        <div class="notes">
            <h3>Notes:</h3>
            <p>{{notes}}</p>
        </div>

        <footer class="invoice-footer">
            <p>Thank you for your business!</p>
        </footer>
    </div>
</body>
</html>
    `;
  }

  /**
   * Default CSS template
   */
  getDefaultCSS() {
    return `
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

.invoice {
    max-width: 800px;
    margin: 0 auto;
    background-color: white;
    padding: 40px;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

.invoice-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 30px;
    border-bottom: 2px solid #333;
    padding-bottom: 20px;
}

.company-info h1 {
    color: #333;
    margin: 0 0 10px 0;
}

.invoice-info h2 {
    color: #333;
    margin: 0 0 10px 0;
    text-align: right;
}

.customer-info {
    margin-bottom: 30px;
}

.customer-info h3 {
    color: #333;
    margin-bottom: 10px;
}

.items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
}

.items-table th,
.items-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

.items-table th {
    background-color: #f8f9fa;
    font-weight: bold;
}

.totals {
    margin-left: auto;
    width: 300px;
}

.totals-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
}

.totals-row.total {
    border-top: 2px solid #333;
    border-bottom: none;
    font-size: 1.2em;
    margin-top: 10px;
    padding-top: 15px;
}

.notes {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #eee;
}

.invoice-footer {
    margin-top: 40px;
    text-align: center;
    color: #666;
    font-style: italic;
}
    `;
  }

  /**
   * Modern HTML template
   */
  getModernTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice {{invoiceNumber}}</title>
    <link rel="stylesheet" href="invoice.css">
</head>
<body>
    <div class="invoice modern">
        <header class="invoice-header">
            <div class="company-info">
                <h1>{{companyName}}</h1>
                <div class="company-details">
                    <p>{{companyAddress}}</p>
                    <p>{{companyPhone}} • {{companyEmail}}</p>
                    <p>{{companyWebsite}}</p>
                </div>
            </div>
            <div class="invoice-info">
                <div class="invoice-number">#{{invoiceNumber}}</div>
                <div class="invoice-details">
                    <p><span>Date:</span> {{invoiceDate}}</p>
                    <p><span>Due:</span> {{dueDate}}</p>
                    <p><span>Terms:</span> {{paymentTerms}}</p>
                </div>
            </div>
        </header>

        <div class="customer-section">
            <h3>Bill To</h3>
            <div class="customer-info">
                <p class="customer-name">{{customerName}}</p>
                <p>{{customerAddress}}</p>
                <p>{{customerEmail}}</p>
            </div>
        </div>

        <div class="items-section">
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {{items}}
                </tbody>
            </table>
        </div>

        <div class="summary-section">
            <div class="summary-table">
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>{{subtotal}}</span>
                </div>
                <div class="summary-row">
                    <span>Tax</span>
                    <span>{{tax}}</span>
                </div>
                <div class="summary-row">
                    <span>Discount</span>
                    <span>{{discount}}</span>
                </div>
                <div class="summary-row total">
                    <span>Total</span>
                    <span>{{total}}</span>
                </div>
            </div>
        </div>

        <div class="notes-section">
            <h3>Notes</h3>
            <p>{{notes}}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Modern CSS template
   */
  getModernCSS() {
    return `
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.invoice {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

.invoice-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 40px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.company-info h1 {
    margin: 0 0 15px 0;
    font-size: 2.5em;
    font-weight: 300;
}

.company-details p {
    margin: 5px 0;
    opacity: 0.9;
}

.invoice-info {
    text-align: right;
}

.invoice-number {
    font-size: 2em;
    font-weight: bold;
    margin-bottom: 15px;
}

.invoice-details p {
    margin: 5px 0;
    opacity: 0.9;
}

.invoice-details span {
    font-weight: 600;
}

.customer-section {
    padding: 40px;
    background: #f8f9fa;
}

.customer-section h3 {
    color: #333;
    margin-bottom: 15px;
    font-size: 1.2em;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.customer-name {
    font-weight: 600;
    font-size: 1.1em;
    margin-bottom: 5px;
}

.items-section {
    padding: 0 40px;
}

.items-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
}

.items-table th {
    background: #f8f9fa;
    padding: 15px;
    text-align: left;
    font-weight: 600;
    color: #333;
    border-bottom: 2px solid #e9ecef;
}

.items-table td {
    padding: 15px;
    border-bottom: 1px solid #e9ecef;
}

.summary-section {
    padding: 40px;
    background: #f8f9fa;
}

.summary-table {
    max-width: 300px;
    margin-left: auto;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #e9ecef;
}

.summary-row.total {
    border-top: 2px solid #667eea;
    border-bottom: none;
    font-size: 1.3em;
    font-weight: 600;
    color: #667eea;
    margin-top: 10px;
    padding-top: 15px;
}

.notes-section {
    padding: 40px;
    border-top: 1px solid #e9ecef;
}

.notes-section h3 {
    color: #333;
    margin-bottom: 15px;
    font-size: 1.2em;
    text-transform: uppercase;
    letter-spacing: 1px;
}
    `;
  }

  /**
   * Minimal HTML template
   */
  getMinimalTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice {{invoiceNumber}}</title>
    <link rel="stylesheet" href="invoice.css">
</head>
<body>
    <div class="invoice minimal">
        <div class="header">
            <div class="company">{{companyName}}</div>
            <div class="invoice-number">Invoice {{invoiceNumber}}</div>
        </div>

        <div class="details">
            <div class="left">
                <p><strong>Bill to:</strong></p>
                <p>{{customerName}}</p>
                <p>{{customerAddress}}</p>
                <p>{{customerEmail}}</p>
            </div>
            <div class="right">
                <p><strong>Date:</strong> {{invoiceDate}}</p>
                <p><strong>Due:</strong> {{dueDate}}</p>
                <p><strong>Terms:</strong> {{paymentTerms}}</p>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                {{items}}
            </tbody>
        </table>

        <div class="totals">
            <div class="row">
                <span>Subtotal</span>
                <span>{{subtotal}}</span>
            </div>
            <div class="row">
                <span>Tax</span>
                <span>{{tax}}</span>
            </div>
            <div class="row">
                <span>Discount</span>
                <span>{{discount}}</span>
            </div>
            <div class="row total">
                <span>Total</span>
                <span>{{total}}</span>
            </div>
        </div>

        <div class="notes">
            <p><strong>Notes:</strong> {{notes}}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Minimal CSS template
   */
  getMinimalCSS() {
    return `
body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    margin: 0;
    padding: 40px;
    background: white;
    color: #333;
    line-height: 1.6;
}

.invoice {
    max-width: 600px;
    margin: 0 auto;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 1px solid #eee;
}

.company {
    font-size: 24px;
    font-weight: 300;
    color: #333;
}

.invoice-number {
    font-size: 18px;
    color: #666;
}

.details {
    display: flex;
    justify-content: space-between;
    margin-bottom: 40px;
}

.left, .right {
    flex: 1;
}

.left p, .right p {
    margin: 5px 0;
}

.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
}

.items th {
    text-align: left;
    padding: 15px 0;
    border-bottom: 2px solid #333;
    font-weight: 600;
}

.items td {
    padding: 15px 0;
    border-bottom: 1px solid #eee;
}

.totals {
    margin-left: auto;
    width: 200px;
}

.row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
}

.row.total {
    border-top: 2px solid #333;
    margin-top: 10px;
    padding-top: 15px;
    font-weight: 600;
    font-size: 18px;
}

.notes {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #eee;
    color: #666;
}
    `;
  }
}

export const invoiceService = new InvoiceService();
