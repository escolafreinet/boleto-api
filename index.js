require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const mensagem = req.body.message?.content?.text;
  const numero = req.body.message?.origin?.number;

  if (!mensagem || !/^\d{11}$/.test(mensagem)) {
    return res.json({ reply: "Por favor, envie um CPF válido (somente números)." });
  }

  try {
    const clientes = await axios.get(`https://www.asaas.com/api/v3/customers?cpfCnpj=${mensagem}`, {
      headers: { 'access_token': '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmIxMzFjNzIxLWQ0NjAtNDE2MS1hZmI1LWM2MDE4YjFjZmFiNjo6JGFhY2hfOWMyMGE5NjktZGFmNy00MTAyLWE5ZGMtNjM1YzNjYzU2ZTA4' }
    });

    const clienteId = clientes.data.data[0]?.id;

    if (!clienteId) {
      return res.json({ reply: "CPF não encontrado no sistema." });
    }

    const cobrancas = await axios.get(`https://www.asaas.com/api/v3/payments?customer=${clienteId}`, {
      headers: { 'access_token': 'SUA_CHAVE_ASAAS' }
    });

    const boleto = cobrancas.data.data[0];

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
git add .
git commit -m "Adiciona endpoint /webhook para integração com ASAAS"
git push origin main

