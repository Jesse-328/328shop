export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const contract = url.searchParams.get('contract') || url.pathname.split('/')[2];
  const tokenId = url.searchParams.get('tokenId') || url.pathname.split('/')[3];

  if (!contract || !tokenId) {
    return new Response('Not found', { status: 404 });
  }

  let tokenName = '328 Photography';
  let tokenDescription = 'NFT Shop — 328photography.xyz';
  let tokenImage = 'https://328photography.xyz/wp-content/uploads/2024/01/logo.png';

  try {
    const query = `
      query {
        token(where: {
          fa: { contract: { _eq: "${contract}" } }
          token_id: { _eq: "${tokenId}" }
        }, limit: 1) {
          name
          description
          display_uri
          thumbnail_uri
        }
      }
    `;

    const res = await fetch('https://data.objkt.com/v3/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    const token = data?.data?.token?.[0];

    if (token) {
      tokenName = token.name || tokenName;
      tokenDescription = token.description
        ? token.description.slice(0, 200)
        : '328 Photography — NFT Shop';

      // Try thumbnail_uri first (smaller, faster), then display_uri
      const imageUri = token.thumbnail_uri || token.display_uri;
      if (imageUri) {
        tokenImage = imageUri.startsWith('ipfs://')
          ? `https://dweb.link/ipfs/${imageUri.slice(7)}`
          : imageUri;
      }
    }
  } catch (e) {
    // Fall through to defaults
  }

  const shopUrl = `https://shop.328photography.xyz/token/${contract}/${tokenId}`;
  const redirectUrl = `https://shop.328photography.xyz/?token=${contract}/${tokenId}`;

  const safeName = tokenName.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const safeDesc = tokenDescription.replace(/"/g, '&quot;').replace(/</g, '&lt;');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${safeName} — 328 Photography</title>
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shopUrl}" />
  <meta property="og:title" content="${safeName} — 328 Photography" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${tokenImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="1200" />
  <meta property="og:site_name" content="328 Photography Shop" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeName} — 328 Photography" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${tokenImage}" />
  <meta http-equiv="refresh" content="0;url=${redirectUrl}" />
  <script>window.location.replace('${redirectUrl}');</script>
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 's-maxage=3600'
    }
  });
}
