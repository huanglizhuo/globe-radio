# Deployment Guide - Globe Radio

This guide will help you deploy Globe Radio to Cloudflare Pages using GitHub Actions.

## Prerequisites

1. **GitHub Repository**: Push your code to a GitHub repository
2. **Cloudflare Account**: Create a free account at [cloudflare.com](https://www.cloudflare.com/)
3. **MapTiler API Key**: Get a free API key at [maptiler.com](https://www.maptiler.com/cloud/)

## Setup Instructions

### 1. Get Your MapTiler API Key

1. Go to [https://www.maptiler.com/cloud/](https://www.maptiler.com/cloud/)
2. Create a free account
3. Navigate to **Account → Keys**
4. Copy your API key (Free tier: 100,000 requests/month)

### 2. Get Cloudflare Credentials

#### Cloudflare Account ID
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your domain or go to **Pages**
3. Your Account ID is shown in the right sidebar (under "Account details")

#### Cloudflare API Token
1. Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Edit Cloudflare Pages** template or create custom token with:
   - Permissions: `Account - Cloudflare Pages - Edit`
   - Account Resources: `Include - Your Account`
4. Click **Continue to summary** → **Create Token**
5. **Copy the token immediately** (you won't see it again!)

### 3. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret** and add the following secrets:

| Secret Name | Description | Where to Get It |
|------------|-------------|-----------------|
| `MAPTILER_API_KEY` | MapTiler API key | [maptiler.com/cloud](https://www.maptiler.com/cloud/) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | Cloudflare Dashboard → Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Cloudflare Dashboard → Account details |

**Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions.

### 4. Create Cloudflare Pages Project

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
2. Click **Create a project**
3. Choose **Direct Upload** (or connect your GitHub repo)
4. Set **Project name**: `globe-radio` (must match workflow file!)
5. Click **Create project**

### 5. Deploy

#### Automatic Deployment (Recommended)

Every push to the `main` branch will automatically trigger a deployment:

```bash
git add .
git commit -m "Deploy to Cloudflare Pages"
git push origin main
```

#### Manual Deployment

You can also trigger deployment manually:

1. Go to **Actions** tab in your GitHub repository
2. Select **Deploy to Cloudflare Pages** workflow
3. Click **Run workflow** → **Run workflow**

### 6. Verify Deployment

1. Go to GitHub **Actions** tab
2. Click on the latest workflow run
3. Wait for the deployment to complete (usually 2-3 minutes)
4. Your site will be live at: `https://globe-radio.pages.dev`

## Local Development

### Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd globe-radio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. Add your MapTiler API key to `.env`:
   ```env
   VITE_MAPTILER_API_KEY=your_actual_api_key_here
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_MAPTILER_API_KEY` | Yes | MapTiler API key for map tiles |

## Troubleshooting

### Deployment Fails

**Issue**: GitHub Action fails with authentication error

**Solution**:
- Verify your `CLOUDFLARE_API_TOKEN` has the correct permissions
- Ensure `CLOUDFLARE_ACCOUNT_ID` matches your Cloudflare account
- Check that the `projectName` in `.github/workflows/deploy.yml` matches your Cloudflare Pages project name

### Map Not Loading

**Issue**: Map tiles not loading or showing errors

**Solution**:
- Verify `VITE_MAPTILER_API_KEY` is set correctly in GitHub Secrets
- Check MapTiler API key quota at [maptiler.com/cloud](https://www.maptiler.com/cloud/)
- Ensure the API key is valid and not expired

### Build Errors

**Issue**: Build fails during `npm run build`

**Solution**:
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check Node.js version (requires Node 18+)

## Custom Domain

To use a custom domain with Cloudflare Pages:

1. Go to your Cloudflare Pages project
2. Click **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter your domain name
5. Follow the DNS configuration instructions

## GitHub Workflow Details

The workflow (`.github/workflows/deploy.yml`) does the following:

1. **Checkout**: Clones your repository
2. **Setup Node.js**: Installs Node.js 20 with npm cache
3. **Install dependencies**: Runs `npm ci` for clean install
4. **Build**: Builds the app with `npm run build` using the MapTiler API key
5. **Deploy**: Deploys the `dist/` folder to Cloudflare Pages

## Cost

- **Cloudflare Pages**: Free (up to 500 builds/month)
- **MapTiler API**: Free tier (100,000 map requests/month)
- **GitHub Actions**: Free for public repositories

## Security Notes

- **Never commit `.env` files** to Git (already in `.gitignore`)
- **Keep API keys in GitHub Secrets** only
- **Rotate API tokens** if accidentally exposed
- **Use separate API keys** for development and production

## Support

For issues or questions:
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [MapTiler Documentation](https://docs.maptiler.com/)
