const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: "https://finance-tracker-beta-wine.vercel.app"
}));
app.use(express.json());

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyN6WD1uZzFFC7cZCKOvElma-6ibLBnJr0ClMFAYErBmYylGP5v9lkbQu6z0p1khjppEw/exec';

app.post('/api/submit', async (req, res) => {
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Submit Error:', err);
    res.status(500).json({ success: false, message: 'Error submitting data' });
  }
});

app.put('/api/transaction/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const payload = {
      ...req.body,
      action: "edit",
      id
    };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Edit Error:', err);
    res.status(500).json({ success: false, message: 'Error editing data' });
  }
});

app.delete('/api/transaction/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const payload = {
      action: "delete",
      id
    };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Delete Error:', err);
    res.status(500).json({ success: false, message: 'Error deleting data' });
  }
});

app.get('/api/data', async (req, res) => {
  try {
    const response = await fetch(SCRIPT_URL);
    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Data Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
