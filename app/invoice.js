// TechNova O2C - Invoice Generator
// Loaded as external script to avoid HTML parser interference with JS strings

function generateInvoice(idx) {
  var order = (window.__orders || window.DEMO_ORDERS || [])[idx];
  if (!order) { alert('Order not found'); return; }

  var cust  = (window.DEMO_CUSTOMERS || []).find(function(c) {
    return c.customerName === order.customerName;
  }) || {};

  var inv   = 'INV-TN-' + (order.salesOrderId || '').replace('SO-TN-', '');
  var sub   = Number(order.orderValue) || 0;
  var cgst  = Math.round(sub * 0.09);
  var sgst  = Math.round(sub * 0.09);
  var tot   = sub + cgst + sgst;
  var due   = new Date(Date.now() + 30 * 864e5).toLocaleDateString('en-IN');
  var today = new Date().toLocaleDateString('en-IN');
  var INR   = function(v) { return '\u20B9' + Number(v || 0).toLocaleString('en-IN'); };
  var fmtD  = function(s) { return s ? new Date(s).toLocaleDateString('en-IN') : '-'; };

  var css = [
    'body{font-family:Arial,sans-serif;margin:0;padding:40px;color:#1a1a2e;background:#fff}',
    '.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0070f2;padding-bottom:16px;margin-bottom:24px}',
    '.brand{font-size:22px;font-weight:800;color:#0070f2}',
    '.brand small{display:block;font-size:11px;color:#666;font-weight:400;margin-top:3px}',
    '.meta{text-align:right;font-size:13px;color:#555}',
    'h1{color:#0070f2;font-size:26px;letter-spacing:2px;margin:0}',
    '.parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}',
    '.party h4{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}',
    '.party p{font-size:13px;line-height:1.7;margin:0}',
    'table{width:100%;border-collapse:collapse;margin-bottom:20px}',
    'th{background:#0070f2;color:#fff;padding:10px 14px;text-align:left;font-size:12px}',
    'td{padding:10px 14px;border-bottom:1px solid #eee;font-size:13px}',
    '.totals{margin-left:auto;width:280px}',
    '.totals table{margin:0}',
    '.totals td{border:none;padding:5px 14px}',
    '.grand{background:#0070f2;color:#fff;font-weight:700}',
    '.grand td{padding:10px 14px}',
    '.stamp{background:#00c48c;color:#fff;padding:8px 18px;border-radius:20px;font-weight:700;font-size:13px;display:inline-block}',
    '.footer{display:flex;justify-content:space-between;align-items:center;margin-top:32px;padding-top:16px;border-top:1px solid #eee}',
    '.footer p{font-size:11px;color:#888;margin:2px 0}',
    '.terms{background:#f0f4ff;border-radius:10px;padding:14px;font-size:12px;color:#555;line-height:1.6;margin-bottom:20px}',
    '.printbtn{background:#0070f2;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:20px}',
    '@media print{.printbtn,.noprint{display:none}}'
  ].join('\n');

  var body = '<div class="hdr">' +
    '<div>' +
      '<div class="brand">TechNova Solutions' +
        '<small>GSTIN: 27AABCT1332L1ZP &nbsp;|&nbsp; PAN: AABCT1332L</small>' +
      '</div>' +
      '<p style="font-size:12px;color:#666;margin-top:4px">' +
        'Plot 42, MIDC Phase II, Pune, Maharashtra - 411018<br>' +
        'orders@technova-solutions.com &nbsp;|&nbsp; +91-20-66789900' +
      '</p>' +
    '</div>' +
    '<div><h1>INVOICE</h1>' +
      '<div class="meta"><b>' + inv + '</b><br>Date: ' + today + '<br>Due: ' + due + '</div>' +
    '</div>' +
  '</div>' +

  '<div class="parties">' +
    '<div class="party"><h4>Bill To</h4><p><b>' + (order.customerName || '') + '</b><br>' +
      (cust.city || '') + ', India<br>' +
      'GSTIN: ' + (cust.customerId || '-') + '-GST' +
    '</p></div>' +
    '<div class="party"><h4>Order Reference</h4><p><b>' + (order.salesOrderId || '') + '</b><br>' +
      'Order Date: ' + fmtD(order.orderDate) + '<br>' +
      'Payment Terms: Net 30 Days<br>Currency: INR' +
    '</p></div>' +
  '</div>' +

  '<table><thead><tr>' +
    '<th>#</th><th>Description</th><th>SAP Code</th><th>Qty</th><th>Rate</th><th>Amount</th>' +
  '</tr></thead><tbody><tr>' +
    '<td>1</td>' +
    '<td>Supply of Goods/Services &mdash; ' + (order.salesOrderId || '') + '</td>' +
    '<td>MAT-TN-001</td><td>1</td><td>' + INR(sub) + '</td><td>' + INR(sub) + '</td>' +
  '</tr></tbody></table>' +

  '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
    '<div class="terms"><b>Terms &amp; Conditions:</b><br>' +
      '1. Payment due within 30 days of invoice date.<br>' +
      '2. Late payments attract 1.5% interest per month.<br>' +
      '3. Goods once delivered cannot be returned without prior approval.<br>' +
      '4. Subject to Pune jurisdiction only.' +
    '</div>' +
    '<div class="totals"><table>' +
      '<tr><td>Subtotal</td><td style="text-align:right">' + INR(sub) + '</td></tr>' +
      '<tr><td>CGST @ 9%</td><td style="text-align:right">' + INR(cgst) + '</td></tr>' +
      '<tr><td>SGST @ 9%</td><td style="text-align:right">' + INR(sgst) + '</td></tr>' +
      '<tr class="grand"><td><b>TOTAL</b></td><td style="text-align:right"><b>' + INR(tot) + '</b></td></tr>' +
    '</table></div>' +
  '</div>' +

  '<div class="footer"><div>' +
    '<p>Bank: HDFC Bank &nbsp;|&nbsp; A/C: 50100123456789</p>' +
    '<p>IFSC: HDFC0001234 &nbsp;|&nbsp; Branch: Pune - Baner</p>' +
  '</div>' +
  '<span class="stamp">&#10003; CONFIRMED</span></div>' +

  '<div style="text-align:center;margin-top:24px">' +
    '<button class="printbtn" onclick="window.print()">&#128438; Print / Save as PDF</button>' +
    '<p style="font-size:11px;color:#888;margin-top:8px">' +
      'In the print dialog, choose Save as PDF to download' +
    '</p>' +
  '</div>';

  var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
    '<title>Invoice ' + inv + '</title>' +
    '<style>' + css + '</style>' +
    '</head><body>' + body + '</body></html>';

  var blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank');
}
