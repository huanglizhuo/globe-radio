# Cloudflare Workers Deployment Guide

This guide explains how to deploy the Globe Radio application from Cloudflare Pages to Cloudflare Workers.

## Overview

The migration from Pages to Workers provides:
- **Better performance**: Edge computing with V8 isolation
- **More control**: Full request/response manipulation
- **Custom routing**: Advanced routing logic
- **KV storage**: Built-in key-value storage (if needed)
- **Cron triggers**: Scheduled tasks (if needed)

## Files Added

- `wrangler.toml` - Cloudflare Workers configuration
- `src/worker.ts` - Worker script for serving assets and API proxying

## Build Scripts Added

- `npm run build:worker` - Build both the app and worker script
- `npm run deploy` - Deploy to production
- `npm run deploy:dev` - Deploy to development environment

## Deployment Steps

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Build the Application

```bash
npm run build:worker
```

This will:
1. Build the React application with Vite
2. Build the Worker script with esbuild
3. Output everything to the `dist/` folder

### 4. Deploy to Workers

#### Development Deployment:
```bash
npm run deploy:dev
```

#### Production Deployment:
```bash
npm run deploy
```

### 5. Configure Custom Domain (Optional)

Edit `wrangler.toml` to add your custom domain:

```toml
[[routes]]
pattern = "yourdomain.com/*"
zone_name = "yourdomain.com"
```

## How It Works

The Worker script (`src/worker.ts`) handles:

1. **Static Asset Serving**: Serves the built React app files from the `dist/` directory
2. **API Proxying**: Proxies requests from `/api/radio/*` to `https://all.api.radio-browser.info`
3. **SPA Routing**: Falls back to `index.html` for client-side routing
4. **Error Handling**: Provides proper error responses and 404 handling

## Key Differences from Pages

1. **Single Script**: All logic is in one Worker script instead of separate Functions
2. **Asset Binding**: Static assets are bound to the Worker using the `[assets]` section
3. **Direct Control**: Full control over request/response handling
4. **Better Performance**: Workers run on Cloudflare's edge network with V8 isolation

## Development

For local development, you can still use:

```bash
npm run dev
```

This runs the Vite development server with the API proxy for testing.

## Troubleshooting

### Build Issues
- Make sure all dependencies are installed: `npm install`
- Check that TypeScript compilation succeeds: `npm run build`

### Deployment Issues
- Verify you're logged in: `wrangler whoami`
- Check wrangler.toml configuration
- Ensure your Cloudflare account has Workers enabled

### Runtime Issues
- Check Worker logs: `wrangler tail`
- Verify API proxying works correctly
- Test static asset serving

## Next Steps

1. **Test thoroughly** in the development environment first
2. **Monitor performance** after migration
3. **Consider Workers KV** if you need server-side storage
4. **Explore Cron Triggers** for scheduled tasks
5. **Add monitoring** with Workers Analytics

## Rollback

If you need to rollback to Pages, you can:
1. Revert the changes in this guide
2. Deploy your app using the original Pages workflow
3. Update your DNS settings to point back to Pages