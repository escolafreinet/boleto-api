require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const ASAAS_API = 'https://www.asaas.com/api/v3';
const ASAAS_TOKEN = process.env.ASAAS_TOKEN;

app.post('/webhook', async (req, res) => {
  const mensagem = req.body.message?.content?.text;
  const numero = req.body.message?.origin?.number;

  if (!mensagem || !/^\d{11}$/.test(mensagem)) {
    return res.json({ reply: "Por favor, envie um CPF válido (somente números)." });
  }

  try {
    const clientes = await axios.get(`${ASAAS_API}/customers?cpfCnpj=${mensagem}`, {
      headers: { Authorization: `Bearer ${ASAAS_TOKEN}` }
    });

    const clienteId = clientes.data.data[0]?.id;

    if (!clienteId) {
      return res.json({ reply: "CPF não encontrado no sistema." });
    }

    const cobrancas = await axios.get(`${ASAAS_API}/payments?customer=${clienteId}`, {
      headers: { Authorization: `Bearer ${ASAAS_TOKEN}` }
    });

    const boleto = cobrancas.data.data.find(b => b.status === 'PENDING' || b.status === 'OVERDUE');

    if (boleto && boleto.bankSlipUrl) {
      return res.json({ reply: `Segue o link para o seu boleto: ${boleto.bankSlipUrl}` });
    } else {
      return res.json({ reply: "Não encontramos nenhum boleto em aberto para este CPF." });
    }

  } catch (err) {
    console.error(err);
    return res.json({ reply: "Ocorreu um erro ao buscar o boleto. Tente novamente mais tarde." });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
