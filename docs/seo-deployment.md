# HabeshaGo SEO And Deployment Notes

## Public Indexable Routes

- `/`
- `/addis-ababa`, `/bole`, `/piassa`, `/cmc`, `/megenagna`
- `/category/food`, `/category/grocery`, `/category/pharmacy`, `/category/coffee`, `/category/pizza`, `/category/injera`, `/category/burger`
- `/merchant/{merchant-slug}`
- `/product/{product-slug}`
- `/search?q=pizza` and Amharic queries such as `/search?q=ፒዛ`

Each public page renders title, meta description, canonical URL, Open Graph tags, Twitter card tags, and JSON-LD structured data.

## Private Noindex Routes

- `/app`
- `/admin`
- `/merchant`
- dashboard/account/checkout/wallet/API paths

Private pages use `noindex, nofollow`, and `robots.txt` blocks private/API areas. `sitemap.xml` includes public pages only.

## Production DNS Targets

- `www.habeshago.com` -> public website
- `app.habeshago.com` -> customer ordering app
- `merchant.habeshago.com` -> merchant portal
- `admin.habeshago.com` -> admin portal
- `driver.habeshago.com` -> driver portal
- `api.habeshago.com` -> backend API

## Launch Tasks

- Enable HTTPS/SSL on every domain.
- Configure CORS for the production domains in `backend/.env.production.example`.
- Submit `https://www.habeshago.com/sitemap.xml` to Google Search Console.
- Add Google Analytics or Plausible with privacy review.
- Serve compressed images/assets through a CDN.
- Enable HTTP caching for public pages, `manifest.json`, icons, and static assets.
- Minify JS/CSS in the production frontend build.
