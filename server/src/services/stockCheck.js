const GEMINI_ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// 在庫データをもとに、Gemini API に在庫有無の判定と案内メッセージを問い合わせる。
// GEMINI_API_KEY が未設定の場合は、在庫数のみで判定するモックロジックにフォールバックする。
export async function checkStockWithAI({ productName, stockQty }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    return mockJudgement({ productName, stockQty });
  }

  const prompt = `あなたは店舗の在庫案内AIです。以下の商品在庫情報をもとに、案内すべきかどうかを判定してください。
商品名: ${productName}
現在庫数: ${stockQty}

在庫数が1以上であれば案内可能(inStock: true)、0であれば案内不可(inStock: false)としてください。
必ず次のJSON形式のみで回答してください（説明文やコードブロックは不要です）:
{"inStock": true または false, "message": "利用者に見せる短い日本語メッセージ"}`;

  try {
    const res = await fetch(`${GEMINI_ENDPOINT(model)}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) {
      console.error('Gemini API error', res.status, await res.text());
      return mockJudgement({ productName, stockQty });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text);
    return {
      inStock: Boolean(parsed.inStock),
      message: parsed.message || defaultMessage(parsed.inStock, productName),
      source: 'gemini',
    };
  } catch (err) {
    console.error('Gemini API call failed, falling back to mock judgement:', err.message);
    return mockJudgement({ productName, stockQty });
  }
}

function mockJudgement({ productName, stockQty }) {
  const inStock = stockQty > 0;
  return {
    inStock,
    message: defaultMessage(inStock, productName),
    source: 'mock',
  };
}

function defaultMessage(inStock, productName) {
  return inStock
    ? `${productName}の在庫があります。案内を開始します。`
    : '在庫がありません。';
}
