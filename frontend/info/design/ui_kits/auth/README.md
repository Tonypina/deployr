# deployr Auth UI kit

Login + Register flows for new and returning companies. Mirrors `frontend/app/(auth)/login/page.tsx` and `frontend/app/(auth)/register/page.tsx`.

## Files

- `index.html` — interactive shell. Switch between Login and Register, submit either, see the success state.
- `Login.jsx` — single email + password card. `max-w-sm`. Submit redirects by role in production.
- `Register.jsx` — two-column form: Empresa block + Administrador block. `max-w-md`. Creates the multi-tenant company + first admin user in one POST.

## Patterns it demonstrates

- The `.auth-shell` layout — full-viewport slate-50 background, vertically centered card.
- Inline field-level errors (`label-error` class, `text-xs text-destructive`).
- Sentence-case page titles + tú-form prompts (*"Ingresa tus credenciales para continuar"*).
- Cross-flow link styled as plain `var(--primary)` text (no underline by default).
- Mocked async submit (600 ms timeout) → success interstitial.

## What's not here (vs the real codebase)

- The real flows use `react-hook-form` + `zod`. The kit reproduces the visual + validation message output, not the library wiring.
- The real flows hit `/api/auth/login` and `/api/auth/register` and pivot the user into `/admin | /tech | /client` based on role. The kit just shows a success card.
