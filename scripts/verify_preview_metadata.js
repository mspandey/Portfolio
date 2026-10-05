async function verify() {
  const res = await fetch('https://public-five-psi-47.vercel.app/');
  const html = await res.text();
  console.log('--- LIVE HTML VERIFICATION ---');
  console.log('Status:', res.status);
  
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  const twitterTitleMatch = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i);

  console.log('Title:', titleMatch ? titleMatch[1] : 'NOT FOUND');
  console.log('og:title:', ogTitleMatch ? ogTitleMatch[1] : 'NOT FOUND');
  console.log('og:description:', ogDescMatch ? ogDescMatch[1] : 'NOT FOUND');
  console.log('og:image:', ogImageMatch ? ogImageMatch[1] : 'NOT FOUND');
  console.log('twitter:title:', twitterTitleMatch ? twitterTitleMatch[1] : 'NOT FOUND');
}

verify();
