import { t } from "elysia"

export const ResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.Optional(t.String()),
  data: t.Optional(t.Any()),
  error: t.Optional(
    t.Object({
      code: t.String(),
      details: t.String(),
    }),
  ),
})
