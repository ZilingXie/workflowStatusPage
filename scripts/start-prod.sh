#!/usr/bin/env sh
set -eu

if npm run db:migrate; then
  :
else
  echo "Warning: db:migrate failed; starting app anyway so degraded pages can render while the database is unavailable." >&2
fi

exec npm run start -- -H 0.0.0.0 -p 3000
