import jsPDF from 'jspdf';

const BRAND = [231, 163, 176] as [number, number, number];
const A4_W = 210;
const A4_H = 297;
const MARGIN = 14;
const CONTENT_W = A4_W - MARGIN * 2;
const GAP = 4;

// ── PDF helpers ───────────────────────────────────────────────────────────────

function breakPage(pdf: jsPDF, y: number, needed = 20): number {
  if (y + needed > A4_H - MARGIN) {
    pdf.addPage();
    return MARGIN + 2;
  }
  return y;
}

function drawHeader(pdf: jsPDF, selectedMonth?: string): number {
  let y = MARGIN;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(...BRAND);
  pdf.text("Dolly's Closet", MARGIN, y);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(156, 163, 175);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  pdf.text(`Generated: ${date}`, A4_W - MARGIN, y, { align: 'right' });

  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);

  let title = 'Analytics Report';
  if (selectedMonth) {
    const [year, month] = selectedMonth.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    const mName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    title = `${title} - ${mName}`;
  }
  pdf.text(title, MARGIN, y);

  y += 4;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(MARGIN, y, A4_W - MARGIN, y);
  y += 7;
  return y;
}

function drawSectionDivider(pdf: jsPDF, title: string, y: number): number {
  y += 4;
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.rect(MARGIN, y, CONTENT_W, 8, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...BRAND);
  pdf.text(title.toUpperCase(), MARGIN + 3, y + 5.2);
  y += 8 + 5;
  return y;
}

function drawLeaderDots(pdf: jsPDF, fromX: number, toX: number, y: number) {
  pdf.setDrawColor(190, 195, 205);
  pdf.setLineWidth(0.3);
  pdf.setLineDashPattern([0.3, 2.2], 0);
  pdf.line(fromX + 1.5, y, toX - 1.5, y);
  pdf.setLineDashPattern([], 0);
  pdf.setLineWidth(0.2);
}

function drawSubheading(pdf: jsPDF, title: string, y: number): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(17, 24, 39);
  pdf.text(title, MARGIN, y);
  return y + 5;
}

function drawSummaryCards(pdf: jsPDF, cards: { label: string; value: string | number }[], y: number): number {
  const count = cards.length;
  const cardW = (CONTENT_W - (count - 1) * GAP) / count;
  const cardH = 17;

  cards.forEach((card, i) => {
    const cx = MARGIN + i * (cardW + GAP);
    pdf.setDrawColor(229, 231, 235);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(cx, y, cardW, cardH, 2, 2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(17, 24, 39);
    pdf.text(String(card.value), cx + cardW / 2, y + 7, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    pdf.text(card.label, cx + cardW / 2, y + 13, { align: 'center' });
  });

  return y + cardH + 5;
}

// Most edited in 3 columns: All time | 30 days | 7 days
function drawMostEditedThreePeriods(
  pdf: jsPDF,
  all: { name: string; edits: number }[],
  month: { name: string; edits: number }[],
  week: { name: string; edits: number }[],
  y: number,
  selectedMonth?: string
): number {
  if (selectedMonth) {
    const colW = CONTENT_W;
    const rowH = 7;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Edits In Selected Month', MARGIN, y);
    y += 5;

    const maxEdits = all[0]?.edits ?? 1;
    for (let i = 0; i < all.length; i++) {
      const item = all[i];
      const ry = y + i * rowH;
      const name = item.name.length > 40 ? item.name.slice(0, 38) + '…' : item.name;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(55, 65, 81);
      pdf.text(name, MARGIN, ry);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${item.edits}`, MARGIN + colW, ry, { align: 'right' });

      // Progress bar
      const barY = ry + 1.5;
      const pct = item.edits / maxEdits;
      pdf.setFillColor(243, 244, 246);
      pdf.roundedRect(MARGIN, barY, colW, 1.2, 0.3, 0.3, 'F');
      pdf.setFillColor(...BRAND);
      pdf.roundedRect(MARGIN, barY, colW * pct, 1.2, 0.3, 0.3, 'F');
    }
    return y + all.length * rowH + 4;
  }

  const colW = (CONTENT_W - GAP * 2) / 3;
  const cols = [
    { title: 'All Time', items: all },
    { title: '30 Days', items: month },
    { title: '7 Days', items: week },
  ];
  const rowH = 7;

  // Column headings
  cols.forEach((col, ci) => {
    const cx = MARGIN + ci * (colW + GAP);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(107, 114, 128);
    pdf.text(col.title, cx, y);
  });
  y += 5;

  // Rows
  const maxRows = Math.max(all.length, month.length, week.length);
  for (let i = 0; i < maxRows; i++) {
    const ry = y + i * rowH;
    cols.forEach((col, ci) => {
      const cx = MARGIN + ci * (colW + GAP);
      const item = col.items[i];
      if (!item) return;

      const maxEdits = col.items[0]?.edits ?? 1;
      const name = item.name.length > 18 ? item.name.slice(0, 16) + '…' : item.name;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(55, 65, 81);
      pdf.text(name, cx, ry);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${item.edits}`, cx + colW, ry, { align: 'right' });

      // Mini progress bar
      const barY = ry + 1.5;
      const pct = item.edits / maxEdits;
      pdf.setFillColor(243, 244, 246);
      pdf.roundedRect(cx, barY, colW, 1.2, 0.3, 0.3, 'F');
      if (i === 0) pdf.setFillColor(...BRAND);
      else pdf.setFillColor(209, 213, 219);
      pdf.roundedRect(cx, barY, colW * pct, 1.2, 0.3, 0.3, 'F');
    });
  }

  return y + maxRows * rowH + 4;
}

function drawTwoColumnTable(
  pdf: jsPDF,
  leftTitle: string,
  leftRows: { name: string; badge: string }[],
  rightTitle: string,
  rightRows: { name: string }[],
  y: number
): number {
  const colW = (CONTENT_W - GAP) / 2;
  const lx = MARGIN;
  const rx = MARGIN + colW + GAP;
  const rowH = 5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(17, 24, 39);
  pdf.text(leftTitle, lx, y);
  pdf.text(rightTitle, rx, y);
  y += 5;

  const maxRows = Math.max(leftRows.length, rightRows.length);
  for (let i = 0; i < maxRows; i++) {
    const ry = y + i * rowH;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);

    if (leftRows[i]) {
      const name = leftRows[i].name.length > 28 ? leftRows[i].name.slice(0, 26) + '…' : leftRows[i].name;
      pdf.setTextColor(55, 65, 81);
      pdf.text(name, lx, ry);
      const badgeText = leftRows[i].badge;
      const isOut = badgeText === 'Out of stock';
      pdf.setTextColor(isOut ? 239 : 245, isOut ? 68 : 158, isOut ? 68 : 11);
      pdf.text(badgeText, lx + colW - 1, ry, { align: 'right' });
      drawLeaderDots(pdf, lx + pdf.getTextWidth(name), lx + colW - 1 - pdf.getTextWidth(badgeText), ry - 0.8);
    }

    if (rightRows[i]) {
      const name = rightRows[i].name.length > 30 ? rightRows[i].name.slice(0, 28) + '…' : rightRows[i].name;
      const badge = 'no photo';
      pdf.setTextColor(55, 65, 81);
      pdf.text(name, rx, ry);
      pdf.setTextColor(156, 163, 175);
      pdf.text(badge, rx + colW - 1, ry, { align: 'right' });
      drawLeaderDots(pdf, rx + pdf.getTextWidth(name), rx + colW - 1 - pdf.getTextWidth(badge), ry - 0.8);
    }
  }

  return y + maxRows * rowH + 4;
}

function drawMonthlyTable(
  pdf: jsPDF,
  rows: { month: string; users: number; sessions: number; pageViews: number }[],
  y: number
): number {
  if (rows.length === 0) return y;

  const cols = [
    { label: 'Month',      w: 38, align: 'left'  as const },
    { label: 'Users',      w: 38, align: 'right' as const },
    { label: 'Sessions',   w: 42, align: 'right' as const },
    { label: 'Page Views', w: 44, align: 'right' as const },
  ];
  const rowH = 5.5;

  // Header row background
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.rect(MARGIN, y - 3.5, CONTENT_W, rowH, 'FD');

  // Header labels
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(107, 114, 128);
  let cx = MARGIN + 2;
  cols.forEach(col => {
    if (col.align === 'right') {
      pdf.text(col.label, cx + col.w - 2, y, { align: 'right' });
    } else {
      pdf.text(col.label, cx, y);
    }
    cx += col.w;
  });
  y += rowH;

  // Data rows
  rows.forEach((row, i) => {
    if (i % 2 === 1) {
      pdf.setFillColor(250, 250, 252);
      pdf.rect(MARGIN, y - 3.5, CONTENT_W, rowH, 'F');
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    const values = [
      row.month,
      row.users.toLocaleString(),
      row.sessions.toLocaleString(),
      row.pageViews.toLocaleString(),
    ];
    cx = MARGIN + 2;
    cols.forEach((col, ci) => {
      pdf.setTextColor(ci === 0 ? 55 : 107, ci === 0 ? 65 : 114, ci === 0 ? 81 : 128);
      if (col.align === 'right') {
        pdf.text(values[ci], cx + col.w - 2, y, { align: 'right' });
      } else {
        pdf.text(values[ci], cx, y);
      }
      cx += col.w;
    });
    y += rowH;
  });

  // Bottom border
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, y - 2, A4_W - MARGIN, y - 2);

  return y + 3;
}

function drawCategoryBarsColumn(
  pdf: jsPDF,
  items: { category: string; count: number }[],
  startX: number,
  colW: number,
  y: number,
  accentLast = false
): number {
  if (items.length === 0) return y;

  const max = Math.max(...items.map(i => i.count));
  const labelW = colW * 0.45;
  const barMaxW = colW * 0.45;
  const countW = colW * 0.1;
  const rowH = 7;

  items.forEach((item, i) => {
    const ry = y + i * rowH;
    const barW = max > 0 ? (item.count / max) * barMaxW : 0;
    const label = item.category.length > 16 ? item.category.slice(0, 14) + '…' : item.category;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(55, 65, 81);
    pdf.text(label, startX, ry);

    const barX = startX + labelW;
    pdf.setFillColor(243, 244, 246);
    pdf.roundedRect(barX, ry - 3, barMaxW, 3.5, 1, 1, 'F');

    const isAccented = accentLast ? i === items.length - 1 : i === 0;
    if (isAccented) pdf.setFillColor(...BRAND);
    else pdf.setFillColor(209, 213, 219);
    if (barW > 0) pdf.roundedRect(barX, ry - 3, barW, 3.5, 1, 1, 'F');

    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(6.5);
    pdf.text(String(item.count), barX + barMaxW + 2, ry);
    void countW;
  });

  return y + items.length * rowH + 3;
}


function drawPagesList(
  pdf: jsPDF,
  leftTitle: string,
  leftRows: { page: string; views: number }[],
  rightTitle: string,
  rightRows: { page: string; views: number }[],
  y: number
): number {
  const colW = (CONTENT_W - GAP) / 2;
  const lx = MARGIN;
  const rx = MARGIN + colW + GAP;
  const rowH = 5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(17, 24, 39);
  pdf.text(leftTitle, lx, y);
  pdf.text(rightTitle, rx, y);
  y += 5;

  const maxRows = Math.max(leftRows.length, rightRows.length);
  for (let i = 0; i < maxRows; i++) {
    const ry = y + i * rowH;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);

    if (leftRows[i]) {
      const path = (leftRows[i].page || '/').length > 28 ? (leftRows[i].page || '/').slice(0, 26) + '…' : (leftRows[i].page || '/');
      const value = `${leftRows[i].views.toLocaleString()} views`;
      pdf.setTextColor(55, 65, 81);
      pdf.text(path, lx, ry);
      pdf.setTextColor(107, 114, 128);
      pdf.text(value, lx + colW - 1, ry, { align: 'right' });
      drawLeaderDots(pdf, lx + pdf.getTextWidth(path), lx + colW - 1 - pdf.getTextWidth(value), ry - 0.8);
    }

    if (rightRows[i]) {
      const path = rightRows[i].page.length > 28 ? rightRows[i].page.slice(0, 26) + '…' : rightRows[i].page;
      const value = `${rightRows[i].views.toLocaleString()} views`;
      pdf.setTextColor(55, 65, 81);
      pdf.text(path, rx, ry);
      pdf.setTextColor(107, 114, 128);
      pdf.text(value, rx + colW - 1, ry, { align: 'right' });
      drawLeaderDots(pdf, rx + pdf.getTextWidth(path), rx + colW - 1 - pdf.getTextWidth(value), ry - 0.8);
    }
  }

  return y + maxRows * rowH + 4;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function exportAnalyticsPdf(selectedMonth?: string) {
  const analyticsUrl = selectedMonth ? `/api/admin/analytics?month=${selectedMonth}` : '/api/admin/analytics';
  const productsAllUrl = selectedMonth ? `/api/admin/analytics/products?period=month&month=${selectedMonth}` : '/api/admin/analytics/products?period=all';
  const productsMonthUrl = selectedMonth ? `/api/admin/analytics/products?period=month&month=${selectedMonth}` : '/api/admin/analytics/products?period=month';
  const productsWeekUrl = selectedMonth ? `/api/admin/analytics/products?period=month&month=${selectedMonth}` : '/api/admin/analytics/products?period=week';

  const [analyticsRes, productsAllRes, productsMonthRes, productsWeekRes] = await Promise.all([
    fetch(analyticsUrl),
    fetch(productsAllUrl),
    fetch(productsMonthUrl),
    fetch(productsWeekUrl),
  ]);

  const analytics = await analyticsRes.json();
  const productsAll = await productsAllRes.json();
  const productsMonth = await productsMonthRes.json();
  const productsWeek = await productsWeekRes.json();

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = drawHeader(pdf, selectedMonth);

  // ── OVERVIEW ──────────────────────────────────────────────────
  y = drawSectionDivider(pdf, 'Website Analytics', y);
  y = drawSummaryCards(pdf, [
    { label: 'Active Users', value: (analytics.totals?.activeUsers ?? 0).toLocaleString() },
    { label: 'Sessions', value: (analytics.totals?.sessions ?? 0).toLocaleString() },
    { label: 'Page Views', value: (analytics.totals?.pageViews ?? 0).toLocaleString() },
    { label: 'New Users', value: (analytics.totals?.newUsers ?? 0).toLocaleString() },
  ], y);

  const monthlyData = analytics.monthlyData ?? [];
  if (monthlyData.length > 0 && !selectedMonth) {
    y = breakPage(pdf, y, 10 + monthlyData.length * 5.5 + 10);
    y = drawSubheading(pdf, 'Monthly Traffic — Last 12 Months', y);
    y = drawMonthlyTable(pdf, monthlyData, y);
  }

  y = breakPage(pdf, y, 50);
  y = drawPagesList(
    pdf,
    'Customer Pages',
    (analytics.customerPages ?? []).slice(0, 8),
    'Admin & Internal Pages',
    (analytics.internalPages ?? []).slice(0, 8),
    y
  );

  const totalDeviceUsers = (analytics.deviceData ?? []).reduce((s: number, d: { users: number }) => s + d.users, 0);
  y = breakPage(pdf, y, 20);
  y = drawSubheading(pdf, 'Devices', y);
  (analytics.deviceData ?? []).forEach((d: { device: string; users: number }) => {
    const pct = totalDeviceUsers > 0 ? Math.round((d.users / totalDeviceUsers) * 100) : 0;
    const label = d.device.charAt(0).toUpperCase() + d.device.slice(1);
    const value = `${pct}% · ${d.users.toLocaleString()} users`;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(55, 65, 81);
    pdf.text(label, MARGIN, y);
    pdf.setTextColor(107, 114, 128);
    pdf.text(value, A4_W - MARGIN, y, { align: 'right' });
    drawLeaderDots(pdf, MARGIN + pdf.getTextWidth(label), A4_W - MARGIN - pdf.getTextWidth(value), y - 0.8);
    y += 5;
  });

  // ── PRODUCTS (continues on same page with divider) ─────────────
  y = breakPage(pdf, y, 40);
  y = drawSectionDivider(pdf, 'Products', y);

  y = drawSummaryCards(pdf, [
    { label: 'Total Products', value: productsAll.summary?.totalProducts ?? 0 },
    { label: 'Categories', value: productsAll.summary?.totalCategories ?? 0 },
    { label: 'Low Stock', value: productsAll.summary?.lowStock ?? 0 },
    { label: 'Out of Stock', value: productsAll.summary?.outOfStock ?? 0 },
  ], y);

  const topCategories = productsAll.topCategories ?? [];
  if (topCategories.length > 0) {
    y = breakPage(pdf, y, 15 + topCategories.length * 7);
    y = drawSubheading(pdf, 'Products by Category', y);
    y = drawCategoryBarsColumn(pdf, topCategories, MARGIN, CONTENT_W, y, false);
  }

  const allEdited = productsAll.mostEdited ?? [];
  const monthEdited = productsMonth.mostEdited ?? [];
  const weekEdited = productsWeek.mostEdited ?? [];

  if (allEdited.length > 0 || monthEdited.length > 0 || weekEdited.length > 0) {
    const maxRows = Math.max(allEdited.length, monthEdited.length, weekEdited.length);
    y = breakPage(pdf, y, 10 + maxRows * 7);
    y = drawSubheading(pdf, 'Most Edited Products', y);
    y = drawMostEditedThreePeriods(pdf, allEdited, monthEdited, weekEdited, y, selectedMonth);
  }

  const stockAlerts = [
    ...(productsAll.outOfStockList ?? []).map((p: { name: string }) => ({ name: p.name, badge: 'Out of stock' })),
    ...(productsAll.lowStockList ?? []).map((p: { name: string; stock: number }) => ({ name: p.name, badge: `${p.stock} left` })),
  ];

  if (stockAlerts.length > 0 || (productsAll.missingImageList ?? []).length > 0) {
    const maxRows = Math.max(stockAlerts.length, (productsAll.missingImageList ?? []).length);
    y = breakPage(pdf, y, 10 + maxRows * 5);
    y = drawTwoColumnTable(
      pdf,
      'Stock Alerts',
      stockAlerts,
      'Missing Images',
      productsAll.missingImageList ?? [],
      y
    );
  }

  let periodHeader = 'Full';
  if (selectedMonth) {
    const [year, month] = selectedMonth.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    periodHeader = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  pdf.save(`Dolly's Closet Summary - ${periodHeader}.pdf`);
}
