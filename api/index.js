import PDFDocument from 'pdfkit';

const CURRENCIES = {
    USD: { symbol: '$', name: 'US Dollar' },
    EUR: { symbol: '€', name: 'Euro' },
    GBP: { symbol: '£', name: 'British Pound' },
    DZD: { symbol: 'DA', name: 'Algerian Dinar' },
    SAR: { symbol: '﷼', name: 'Saudi Riyal' },
    MAD: { symbol: 'MAD', name: 'Moroccan Dirham' },
    TND: { symbol: 'DT', name: 'Tunisian Dinar' },
    AED: { symbol: 'AED', name: 'UAE Dirham' },
    CAD: { symbol: 'CA$', name: 'Canadian Dollar' },
    JPY: { symbol: '¥', name: 'Japanese Yen' },
};

export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST method allowed' });
    }

    const data = req.body;

    if (!data) {
        return res.status(400).json({ error: 'Invalid JSON input' });
    }

    // --- Input fields ---
    const company = data.company || 'My Company';
    const company_address = data.company_address || '';
    const company_email = data.company_email || '';
    const client = data.client || 'Client Name';
    const client_address = data.client_address || '';
    const invoice_no = data.invoice_no || 'INV-001';
    const date = data.date || new Date().toISOString().split('T')[0];
    const due_date = data.due_date || '';
    const items = Array.isArray(data.items) ? data.items : [];
    const tax_rate = parseFloat(data.tax_rate) || 0;       // e.g. 19 for 19%
    const notes = data.notes || '';
    const logo_base64 = data.logo || null;            // base64 string, no prefix needed
    const format = (data.format || 'json').toLowerCase(); // 'json' | 'pdf'

    // Currency
    const currencyCode = (data.currency || 'USD').toUpperCase();
    const currency = CURRENCIES[currencyCode] || { symbol: currencyCode, name: currencyCode };

    // --- Calculations ---
    let subtotal = 0;
    const processedItems = items.map(item => {
        const qty = parseFloat(item.qty) || 0;
        const price = parseFloat(item.price) || 0;
        const lineTotal = qty * price;
        subtotal += lineTotal;
        return { ...item, qty, price, total: lineTotal };
    });

    const tax_amount = parseFloat(((subtotal * tax_rate) / 100).toFixed(2));
    const total = parseFloat((subtotal + tax_amount).toFixed(2));

    const invoiceData = {
        status: 'success',
        invoice_no,
        company,
        company_address,
        company_email,
        client,
        client_address,
        date,
        due_date,
        currency: currencyCode,
        currency_symbol: currency.symbol,
        items: processedItems,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        notes,
    };

    // --- JSON response ---
    if (format !== 'pdf') {
        return res.status(200).json(invoiceData);
    }

    // --- PDF generation ---
    try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice_no}.pdf"`);
        doc.pipe(res);

        const pageWidth = doc.page.width;
        const leftCol = 50;
        const rightCol = pageWidth - 50;
        const blue = '#1a56db';
        const darkGray = '#1f2937';
        const lightGray = '#f3f4f6';
        const midGray = '#6b7280';

        // ── Header background ──
        doc.rect(0, 0, pageWidth, 110).fill(blue);

        // ── Logo ──
        if (logo_base64) {
            try {
                const imgBuffer = Buffer.from(logo_base64, 'base64');
                doc.image(imgBuffer, leftCol, 20, { width: 70, height: 70 });
            } catch (_) { /* skip bad logo */ }
        }

        // ── Company name in header ──
        doc
            .font('Helvetica-Bold')
            .fontSize(20)
            .fillColor('#ffffff')
            .text(company, logo_base64 ? 135 : leftCol, 30, { width: 300 });

        if (company_address) {
            doc.font('Helvetica').fontSize(9).fillColor('#cbd5e1')
                .text(company_address, logo_base64 ? 135 : leftCol, 56, { width: 300 });
        }
        if (company_email) {
            doc.font('Helvetica').fontSize(9).fillColor('#cbd5e1')
                .text(company_email, logo_base64 ? 135 : leftCol, 70, { width: 300 });
        }

        // ── INVOICE label (top right) ──
        doc
            .font('Helvetica-Bold').fontSize(28).fillColor('#ffffff')
            .text('INVOICE', leftCol, 30, { align: 'right', width: rightCol - leftCol });

        doc
            .font('Helvetica').fontSize(10).fillColor('#cbd5e1')
            .text(`#${invoice_no}`, leftCol, 64, { align: 'right', width: rightCol - leftCol });

        // ── Bill To / Dates block ──
        doc.fillColor(darkGray);
        let y = 130;

        doc.font('Helvetica-Bold').fontSize(9).fillColor(midGray).text('BILL TO', leftCol, y);
        doc.font('Helvetica-Bold').fontSize(12).fillColor(darkGray).text(client, leftCol, y + 14);
        if (client_address) {
            doc.font('Helvetica').fontSize(9).fillColor(midGray).text(client_address, leftCol, y + 30);
        }

        // Dates on the right
        doc.font('Helvetica-Bold').fontSize(9).fillColor(midGray)
            .text('DATE', rightCol - 160, y, { width: 80, align: 'right' });
        doc.font('Helvetica').fontSize(10).fillColor(darkGray)
            .text(date, rightCol - 160, y + 14, { width: 80, align: 'right' });

        if (due_date) {
            doc.font('Helvetica-Bold').fontSize(9).fillColor(midGray)
                .text('DUE DATE', rightCol - 160, y + 34, { width: 80, align: 'right' });
            doc.font('Helvetica').fontSize(10).fillColor(darkGray)
                .text(due_date, rightCol - 160, y + 48, { width: 80, align: 'right' });
        }

        // ── Items table ──
        y = 210;
        const colDesc = leftCol;
        const colQty = 320;
        const colPrice = 400;
        const colTotal = 480;
        const tableW = rightCol - leftCol;

        // Table header
        doc.rect(leftCol, y, tableW, 22).fill(blue);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
        doc.text('DESCRIPTION', colDesc + 4, y + 7, { width: 260 });
        doc.text('QTY', colQty, y + 7, { width: 70, align: 'center' });
        doc.text('PRICE', colPrice, y + 7, { width: 70, align: 'center' });
        doc.text('TOTAL', colTotal, y + 7, { width: 75, align: 'right' });

        y += 22;

        processedItems.forEach((item, i) => {
            const rowH = 22;
            if (i % 2 === 0) doc.rect(leftCol, y, tableW, rowH).fill(lightGray);

            doc.font('Helvetica').fontSize(9).fillColor(darkGray);
            doc.text(item.description || item.name || '-', colDesc + 4, y + 7, { width: 260 });
            doc.text(String(item.qty), colQty, y + 7, { width: 70, align: 'center' });
            doc.text(`${currency.symbol}${item.price.toFixed(2)}`, colPrice, y + 7, { width: 70, align: 'center' });
            doc.text(`${currency.symbol}${item.total.toFixed(2)}`, colTotal, y + 7, { width: 75, align: 'right' });

            y += rowH;
        });

        // ── Totals block ──
        y += 10;
        const totalsX = colTotal - 90;
        const totalsW = 75 + 90;

        const drawTotalRow = (label, value, bold = false) => {
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(midGray)
                .text(label, totalsX, y, { width: 90, align: 'right' });
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(darkGray)
                .text(value, colTotal, y, { width: 75, align: 'right' });
            y += 16;
        };

        drawTotalRow('Subtotal:', `${currency.symbol}${subtotal.toFixed(2)}`);
        if (tax_rate > 0) {
            drawTotalRow(`Tax (${tax_rate}%):`, `${currency.symbol}${tax_amount.toFixed(2)}`);
        }

        // Total row with background
        doc.rect(totalsX - 10, y - 4, totalsW + 20, 24).fill(blue);
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
            .text('TOTAL', totalsX, y + 2, { width: 90, align: 'right' });
        doc.text(`${currency.symbol}${total.toFixed(2)}`, colTotal, y + 2, { width: 75, align: 'right' });
        y += 30;

        // ── Notes ──
        if (notes) {
            y += 10;
            doc.font('Helvetica-Bold').fontSize(9).fillColor(midGray).text('NOTES', leftCol, y);
            doc.font('Helvetica').fontSize(9).fillColor(darkGray).text(notes, leftCol, y + 14, { width: tableW });
        }

        // ── Footer ──
        doc.font('Helvetica').fontSize(8).fillColor(midGray)
            .text('Thank you for your business.', leftCol, doc.page.height - 40, {
                align: 'center',
                width: tableW,
            });

        doc.end();

    } catch (err) {
        return res.status(500).json({ error: 'PDF generation failed', details: err.message });
    }
}