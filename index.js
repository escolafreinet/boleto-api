require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const ASAAS_API = 'https://www.asaas.com/api/v3';
const ASAAS_TOKEN = process.env.ASAAS_TOKEN;

app.post('/segunda-via', async (req, res) => {
  const { cpf } = req.body;

  try {
    const clientes = await axios.get(`${ASAAS_API}/customers?cpfCnpj=${cpf}`, {
      headers: { Authorization: `Bearer ${ASAAS_TOKEN}` }
    });

    if (clientes.data.totalCount === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const customerId = clientes.data.data[0].id;

    const boletos = await axios.get(`${ASAAS_API}/payments?customer=${customerId}`, {
      headers: { Authorization: `Bearer ${ASAAS_TOKEN}` }
    });

    const boleto = boletos.data.data.find(b => b.status === 'PENDING' || b.status === 'OVERDUE');

    if (!boleto) {
      return res.status(404).json({ error: 'Nenhum boleto pendente encontrado' });
    }

    return res.json({ link: boleto.bankSlipUrl });

  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: 'Erro ao buscar boleto' });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
