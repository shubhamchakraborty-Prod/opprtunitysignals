# Users and tokens

`users.dev.json` holds **development-only** users. Tokens are stored as SHA-256 hashes; the plain dev token is `<id>-token` (e.g. `dev-admin-token`) and is listed in `_dev_token_hint` for demos.

For any real deployment:

1. Create `users.json` outside the repository with your own users and long random tokens (store only `token_sha256`).
2. Start the server with `USERS_FILE=/path/to/users.json`.
3. Replace bearer tokens with the organisation's SSO (OIDC/SAML) before handling personal data at scale.

Generate a hash: `node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" 'your-long-random-token'`
