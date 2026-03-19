export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST method allowed' });
    }

    const data = req.body;

    if (!data) {
        return res.status(400).json({ error: 'Invalid JSON input' });
    }

    const company = data.company || 'My Company';
    const client = data.client || 'Client Name';
    const invoice_no = data.invoice_no || '001';
    const date = data.date || new Date().toISOString().split('T')[0];
    const items = data.items || [];

    let total = 0;
    items.forEach(item => {
        total += (item.qty || 0) * (item.price || 0);
    });

    return res.status(200).json({
        status: 'success',
        invoice_no: invoice_no,
        company: company,
        client: client,
        date: date,
        items: items,
        total: total,
        currency: 'USD'
    });
}