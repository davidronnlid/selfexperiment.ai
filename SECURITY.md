# Security Guidelines

This project handles sensitive user data and relies on third-party services (Supabase, OpenAI, Oura, Withings, Google OAuth, etc.).  Follow these practices **before making the repository public or deploying to production.**

---

## 1  Environment Variables

All secrets **must** be provided through environment variables.  Never commit real keys to version control.  See `.env.example` for the full list.

### Local setup
```bash
cp .env.example .env   # fill in values securely
```

### CI / Hosting
Define the same variables in your hosting provider’s secret store (Vercel, Fly.io, Docker, GitHub Actions, etc.).

---

## 2  Rotating Supabase Keys

1. Open your project in the Supabase dashboard.
2. Navigate to **Settings → API**.
3. Click **Generate new** for both
   * `anon` key (public)
   * `service_role` key (server-side only)
4. Update the new values in all environments (.env, CI secrets, edge-function secrets):
   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<new_anon_key>
   SUPABASE_SERVICE_ROLE_KEY=<new_service_key>
   ```
5. Redeploy.  The old keys will immediately stop working.
6. Verify: `curl https://<project>.supabase.co/rest/v1/?apikey=<old_key>` should now return **401**.

Rotate keys whenever a leak is suspected, a team member leaves, or at least annually.

---

## 3  Cleaning Leaked Secrets from Git History

If a secret was committed, removing it from the latest commit is **not** enough—Git retains the data in the history. Follow these steps:

### 3.1  Install `git-filter-repo`
```bash
brew install git-filter-repo   # macOS
# or
pip install git-filter-repo    # Linux / Windows
```

### 3.2  Rewrite History
Replace each leaked string with a placeholder. Example:
```bash
git filter-repo --replace-text <(cat <<'EOF'
eyJhbGciOiJI            ==> REMOVED_SUPABASE_KEY
https://ecstnwwcpl       ==> REMOVED_SUPABASE_URL
OPENAI_API_KEY           ==> REMOVED_OPENAI_KEY
EOF
)
```
Add more lines for every leaked value.  For large files you can also remove entire paths:
```bash
git filter-repo --path src/utils/supaBase.ts --invert-paths
```

### 3.3  Force-Push and Invalidate Caches
```bash
git push --force --all
git push --force --tags
```
All collaborators must now `git clone` again (old clones contain orphaned history).

### 3.4  Revoke the Leaked Keys
Rotation (section 2) ensures even forgotten clones cannot misuse old tokens.

---

## 4  Supabase HTTPS Configuration

Production traffic **must** be encrypted.  In `supabase/config.toml` confirm:
```toml
[api.tls]
enabled = true
```
When self-hosting Supabase CLIs, also provision a valid TLS certificate or use a proxy (NGINX, Cloudflare, etc.) with HTTPS termination.

---

## 5  Reporting Vulnerabilities

If you discover a security issue, please **do not create a public issue**.  Email `security@yourdomain.com` with:
* A detailed description of the vulnerability
* Steps to reproduce
* Any proof-of-concept code or screenshots

We will acknowledge receipt within 48 hours and keep you informed of the fix status.

---

Stay secure and thank you for helping keep the project safe!